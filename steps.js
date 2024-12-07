document.addEventListener('DOMContentLoaded', function () {
    const stepsContainer = document.getElementById('steps-container');
    const solutionSteps = JSON.parse(localStorage.getItem('lp_solution_steps')) || [];

    function formatValue(value) {
        return Number.isInteger(value) ? value : value.toFixed(2);
    }

    solutionSteps.forEach((step, index) => {
        const stepHTML = `
            <h3>Iteración ${index + 1}</h3>
            <table border="1">
                <thead>
                    <tr>
                        <th>Base</th>
                        ${step.headers.map(header => `<th>${header}</th>`).join('')}
                        <th>R</th>
                    </tr>
                </thead>
                <tbody>
                    ${step.rows.map(row => `
                        <tr>
                            <td>${row.Base}</td>
                            ${row.values.map(val => `<td>${formatValue(val)}</td>`).join('')}
                            <td>${formatValue(row.RHS)}</td>
                        </tr>`).join('')}
                </tbody>
            </table>
            <p>${step.description}</p>
        `;
        stepsContainer.innerHTML += stepHTML;
    });
});
