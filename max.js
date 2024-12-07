function simplexMaximizacion(data) {
    const { numVars, numConstraints, objective, constraints } = data;

    const tableau = createTableau(numVars, numConstraints, objective, constraints, false);
    console.log("Tabla inicial de maximización:", tableau);

    const steps = []; 

    try {
        const result = runSimplexAlgorithm(tableau, steps);

        const optimalValue = result.optimalValue;
        console.log("Tabla final de maximización:", tableau);

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
  
        return { solution: result.solution, optimalValue };
    } catch (error) {
        console.error("Error en maximización:", error.message);
        throw error;
    }
}

function createTableau(numVars, numConstraints, objective, constraints, minimize) {
    const tableau = [];
    const numCols = numVars + numConstraints + 1; // Variables originales + holguras + RHS

    // Inicializar el tableau vacío
    for (let i = 0; i <= numConstraints; i++) {
        tableau[i] = Array(numCols).fill(0);
    }

    // Coeficientes de la función objetivo (Z)
    for (let i = 0; i < numVars; i++) {
        tableau[0][i] = minimize ? objective[i] : -objective[i]; // Maximizar: coeficientes negativos
    }

    // Restricciones
    for (let i = 0; i < numConstraints; i++) {
        const { coefficients, value, sign } = constraints[i];

        if (sign === "<=") {
            // Copiar los coeficientes de la restricción
            for (let j = 0; j < numVars; j++) {
                tableau[i + 1][j] = coefficients[j];
            }
            tableau[i + 1][numVars + i] = 1; // Agregar variable de holgura
            tableau[i + 1][numCols - 1] = value;
        } else {
            throw new Error(`Signo de restricción no soportado: ${sign}`);
        }
    }

    return tableau;
}

function runSimplexAlgorithm(tableau, steps) {
    const numRows = tableau.length;
    const numCols = tableau[0].length;
    const numVars = numCols - numRows; // Variables originales
    const headers = [
        ...Array.from({ length: numVars }, (_, i) => `X${i + 1}`), // Variables de decisión
        ...Array.from({ length: numRows - 1 }, (_, i) => `S${i + 1}`), // Variables de holgura
    ];

    let iteration = 0;

    while (true) {
        // Identificar columna pivote (el menor coeficiente en Z)
        let pivotCol = -1;
        let minValue = 0;

        for (let j = 0; j < numCols - 1; j++) {
            if (tableau[0][j] < minValue) {
                minValue = tableau[0][j];
                pivotCol = j;
            }
        }

        if (pivotCol === -1) break; // Óptimo alcanzado

        // Identificar fila pivote (mínima razón positiva)
        let pivotRow = -1;
        let minRatio = Infinity;

        for (let i = 1; i < numRows; i++) {
            if (tableau[i][pivotCol] > 0) {
                const ratio = tableau[i][numCols - 1] / tableau[i][pivotCol];
                if (ratio < minRatio) {
                    minRatio = ratio;
                    pivotRow = i;
                }
            }
        }

        if (pivotRow === -1) throw new Error("El problema no tiene solución");

        // Guardar el estado actual
        steps.push({
            headers, // Usar los encabezados dinámicos aquí
            rows: tableau.map((row, index) => ({
                Base: index === 0 ? "Z" : headers[numVars + index - 1], // Determinar las variables base
                values: row.slice(0, numCols - 1), // Valores de las columnas
                RHS: row[numCols - 1], // RHS (última columna)
            })),
            description: ` `,
        });
        pivot(tableau, pivotRow, pivotCol);
    }

    // Agregar el resultado final al historial de pasos
    steps.push({
        headers, // Usar los encabezados dinámicos aquí también
        rows: tableau.map((row, index) => ({
            Base: index === 0 ? "Z" : headers[numVars + index - 1],
            values: row.slice(0, numCols - 1),
            RHS: row[numCols - 1],
        })),
        description: `Solución óptima alcanzada. Valor óptimo: ${tableau[0][numCols - 1].toFixed(2)}`,
    });

    return {
        solution: extractSolution(tableau),
        optimalValue: tableau[0][tableau[0].length - 1], // El óptimo está en la última celda de la fila Z
    };
}

function extractSolution(tableau) {
    const numVars = tableau[0].length - tableau.length; 
    const solution = Array(numVars).fill(0);

    for (let i = 0; i < numVars; i++) {
        for (let j = 1; j < tableau.length; j++) {
            if (tableau[j][i] === 1) {
                solution[i] = tableau[j][tableau[0].length - 1];
                break;
            }
        }
    }

    return solution;
}

function pivot(tableau, pivotRow, pivotCol) {
    const pivotValue = tableau[pivotRow][pivotCol];

    // Dividir la fila pivote por el elemento pivote
    for (let j = 0; j < tableau[0].length; j++) {
        tableau[pivotRow][j] /= pivotValue;
    }

    // Recalcular las demás filas
    for (let i = 0; i < tableau.length; i++) {
        if (i !== pivotRow) {
            const factor = tableau[i][pivotCol];
            for (let j = 0; j < tableau[0].length; j++) {
                tableau[i][j] -= factor * tableau[pivotRow][j];
            }
        }
    }
}
function renderSlackSurplusTable(data) {
    const tableBody = document.getElementById("slack-surplus-body");
    tableBody.innerHTML = ""; // Limpiar la tabla antes de llenarla

    data.forEach((row, index) => {
        const tr = document.createElement("tr");
        
        // Crear las celdas
        const tdConstraint = document.createElement("td");
        tdConstraint.textContent = `Restricción ${index + 1}`;

        const tdSlackSurplus = document.createElement("td");
        tdSlackSurplus.textContent = row.slackSurplus.toFixed(2);

        const tdDualPrice = document.createElement("td");
        tdDualPrice.textContent = row.dualPrice.toFixed(2);

        // Agregar celdas a la fila
        tr.appendChild(tdConstraint);
        tr.appendChild(tdSlackSurplus);
        tr.appendChild(tdDualPrice);

        // Agregar fila a la tabla
        tableBody.appendChild(tr);
    });
}

