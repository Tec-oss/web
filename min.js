function simplexMinimizacion(data) {
    const { numVars, numConstraints, optimization, objective, constraints } = data;

    let tableau = [];
    let numRows = numConstraints + 1;
    let numCols = numVars + numConstraints + 1;

    // Inicializar el tableau
    for (let i = 0; i < numRows; i++) {
        tableau[i] = new Array(numCols).fill(0);
    }

    // Configurar la fila Z para minimizar (invertir los coeficientes si es minimización)
    for (let i = 0; i < numVars; i++) {
        tableau[0][i] = optimization === 'Minimizar' ? -objective[i] : objective[i];
    }

    // Configurar las restricciones
    for (let i = 1; i < numRows; i++) {
        const constraint = constraints[i - 1];
        for (let j = 0; j < numVars; j++) {
            tableau[i][j] = constraint.coefficients[j];
        }
        tableau[i][numVars + i - 1] = 1; // Variables de holgura
        tableau[i][numCols - 1] = constraint.value; // RHS
    }

    const steps = []; // Para almacenar los pasos intermedios
    const solution = simplexMetododo(tableau, steps, optimization);

    let optimalValue = tableau[0][numCols - 1];
    if (optimization === 'Minimizar') {
        optimalValue = -optimalValue;
    }

    // Guardar los pasos en localStorage
    localStorage.setItem("lp_solution_steps", JSON.stringify(steps));
    // Calcular Slack/Surplus y Dual Prices
    const slackSurplusData = [];
    for (let i = 1; i < tableau.length; i++) {
        let slackSurplus = tableau[i][tableau[0].length - 1];
        
        for (let j = 0; j < numVars; j++) {
            slackSurplus -= tableau[i][j] * result.solution[j];
        }

        slackSurplusData.push({
            slackSurplus, 
            dualPrice: tableau[0][numVars + i - 1], 
        });
    }
    // Mostrar los resultados en la tabla HTML
    renderSlackSurplusTable(slackSurplusData);

    return { solution, optimalValue };
}

function simplexMetododo(tableau, steps, optimization) {
    const numRows = tableau.length;
    const numCols = tableau[0].length;
    const epsilon = 1e-8;
    let iteration = 0;

    while (true) {
        let pivotCol = -1;
        let minValue = (optimization === 'Minimizar') ? Infinity : 0;  // Buscar el valor más positivo para minimizar
        for (let j = 0; j < numCols - 1; j++) {
            if ((optimization === 'Minimizar' && tableau[0][j] > minValue + epsilon) ||
                (optimization !== 'Minimizar' && tableau[0][j] < minValue - epsilon)) {
                minValue = tableau[0][j];
                pivotCol = j;
            }
        }

        if (pivotCol === -1) {
            break; // Solución óptima alcanzada
        }

        let pivotRow = -1;
        let minRatio = Infinity;
        for (let i = 1; i < numRows; i++) {
            if (tableau[i][pivotCol] > epsilon) {
                const ratio = tableau[i][numCols - 1] / tableau[i][pivotCol];
                if (ratio < minRatio) {
                    minRatio = ratio;
                    pivotRow = i;
                }
            }
        }

        if (pivotRow === -1) {
            throw new Error('Solución ilimitada.');
        }

        // Guardar el estado actual del tableau en los pasos
        steps.push({
            headers: Array.from({ length: numCols - 1 }, (_, i) => `X${i + 1}`),
            rows: tableau.map((row, index) => ({
                Base: index === 0 ? "Z" : `S${index}`,
                values: row.slice(0, numCols - 1),
                RHS: row[numCols - 1],
            })),
            description: ` `,
        });

        // Realizar el pivoteo
        pivot(tableau, pivotRow, pivotCol);
    }

    // Guardar el estado final
    steps.push({
        headers: Array.from({ length: numCols - 1 }, (_, i) => `X${i + 1}`),
        rows: tableau.map((row, index) => ({
            Base: index === 0 ? "Z" : `S${index}`,
            values: row.slice(0, numCols - 1),
            RHS: row[numCols - 1],
        })),
        description: `Solución óptima alcanzada. Valor óptimo: ${tableau[0][numCols - 1].toFixed(2)}`
    });

    const numVars = tableau[0].length - tableau.length;
    const solution = new Array(numVars).fill(0);
    for (let j = 0; j < numVars; j++) {
        let isBasic = false;
        let basicRow = -1;
        for (let i = 1; i < numRows; i++) {
            if (Math.abs(tableau[i][j] - 1) < epsilon) {
                if (isBasic) {
                    isBasic = false;
                    break;
                } else {
                    isBasic = true;
                    basicRow = i;
                }
            } else if (Math.abs(tableau[i][j]) > epsilon) {
                isBasic = false;
                break;
            }
        }
        if (isBasic) {
            solution[j] = tableau[basicRow][tableau[0].length - 1];
        }
    }

    return solution;
}

function pivot(tableau, pivotRow, pivotCol) {
    const numRows = tableau.length;
    const numCols = tableau[0].length;
    const pivotValue = tableau[pivotRow][pivotCol];

    for (let j = 0; j < numCols; j++) {
        tableau[pivotRow][j] /= pivotValue;
    }

    for (let i = 0; i < numRows; i++) {
        if (i !== pivotRow) {
            const factor = tableau[i][pivotCol];
            for (let j = 0; j < numCols; j++) {
                tableau[i][j] -= factor * tableau[pivotRow][j];
            }
        }
    }
}
function renderSlackSurplusTable(data) {
    const tableBody = document.getElementById("slack-surplus-body");
    tableBody.innerHTML = "";

    data.forEach((row, index) => {
        const tr = document.createElement("tr");

        const tdConstraint = document.createElement("td");
        tdConstraint.textContent = `Restricción ${index + 1}`;

        const tdSlackSurplus = document.createElement("td");
        tdSlackSurplus.textContent = row.slackSurplus.toFixed(2);

        const tdDualPrice = document.createElement("td");
        tdDualPrice.textContent = row.dualPrice.toFixed(2);

        tr.appendChild(tdConstraint);
        tr.appendChild(tdSlackSurplus);
        tr.appendChild(tdDualPrice);

        tableBody.appendChild(tr);
    });
}