/* ======================================
   AEGIS WORKSPACE — FORMULA ENGINE
====================================== */

const FormulaEngine = {

    /* -------------------------------
       MAIN CALCULATOR
    -------------------------------- */

    calculate(formula, cells) {

        if (typeof formula !== "string") {
            return formula;
        }

        if (!formula.startsWith("=")) {
            return formula;
        }

        let expression = formula.substring(1).trim();

        try {

            // Functions
            expression = expression.replace(
                /SUM\(([^)]+)\)/gi,
                (_, range) => this.sum(range, cells)
            );

            expression = expression.replace(
                /AVERAGE\(([^)]+)\)/gi,
                (_, range) => this.average(range, cells)
            );

            expression = expression.replace(
                /MIN\(([^)]+)\)/gi,
                (_, range) => this.min(range, cells)
            );

            expression = expression.replace(
                /MAX\(([^)]+)\)/gi,
                (_, range) => this.max(range, cells)
            );

            expression = expression.replace(
                /COUNT\(([^)]+)\)/gi,
                (_, range) => this.count(range, cells)
            );

            // IF
            expression = expression.replace(
                /IF\(([^,]+),([^,]+),([^)]+)\)/gi,
                (_, condition, trueValue, falseValue) => {

                    const result = this.evaluateExpression(
                        condition,
                        cells
                    );

                    return result
                        ? this.cleanValue(trueValue)
                        : this.cleanValue(falseValue);
                }
            );

            // Replace remaining cell references
            expression = expression.replace(
                /\$?([A-Z]+)\$?(\d+)/gi,
                (_, column, row) => {
                    return this.getCellValue(
                        `${column.toUpperCase()}${row}`,
                        cells
                    );
                }
            );

            return this.evaluateExpression(expression, cells);

        } catch (error) {

            console.error(
                "Formula error:",
                formula,
                error
            );

            return "#ERROR!";
        }
    },


    /* -------------------------------
       CELL VALUE
    -------------------------------- */

    getCellValue(address, cells) {

        const cell = cells[address];

        if (cell === undefined || cell === null || cell === "") {
            return 0;
        }

        // If cell contains another formula,
        // calculate it first.
        if (
            typeof cell === "string" &&
            cell.startsWith("=")
        ) {
            return this.calculate(cell, cells);
        }

        const number = Number(cell);

        return Number.isNaN(number)
            ? `"${String(cell).replace(/"/g, '\\"')}"`
            : number;
    },


    /* -------------------------------
       RANGE
    -------------------------------- */

    getRange(range, cells) {

        const parts = range
            .trim()
            .split(":");

        if (parts.length !== 2) {
            return [
                this.getCellValue(
                    parts[0],
                    cells
                )
            ];
        }

        const start = this.parseAddress(parts[0]);
        const end = this.parseAddress(parts[1]);

        if (!start || !end) {
            return [];
        }

        const values = [];

        for (
            let row = start.row;
            row <= end.row;
            row++
        ) {

            for (
                let col = start.col;
                col <= end.col;
                col++
            ) {

                const address =
                    this.columnName(col) + row;

                const value =
                    this.getRawCellValue(
                        address,
                        cells
                    );

                if (
                    value !== "" &&
                    value !== null &&
                    value !== undefined &&
                    !Number.isNaN(Number(value))
                ) {
                    values.push(Number(value));
                }
            }
        }

        return values;
    },


    getRawCellValue(address, cells) {

        const value = cells[address];

        if (
            typeof value === "string" &&
            value.startsWith("=")
        ) {
            return this.calculate(
                value,
                cells
            );
        }

        return value;
    },


    /* -------------------------------
       FUNCTIONS
    -------------------------------- */

    sum(range, cells) {

        return this
            .getRange(range, cells)
            .reduce(
                (total, value) =>
                    total + Number(value),
                0
            );
    },


    average(range, cells) {

        const values =
            this.getRange(range, cells);

        if (!values.length) {
            return 0;
        }

        return this.sum(range, cells) /
            values.length;
    },


    min(range, cells) {

        const values =
            this.getRange(range, cells);

        return values.length
            ? Math.min(...values)
            : 0;
    },


    max(range, cells) {

        const values =
            this.getRange(range, cells);

        return values.length
            ? Math.max(...values)
            : 0;
    },


    count(range, cells) {

        return this
            .getRange(range, cells)
            .length;
    },


    /* -------------------------------
       EXPRESSION EVALUATION
    -------------------------------- */

    evaluateExpression(expression, cells) {

        expression = expression.trim();

        // Comparison operators
        const comparison =
            expression.match(
                /^(.+?)\s*(>=|<=|<>|=|>|<)\s*(.+)$/
            );

        if (comparison) {

            const left =
                this.cleanValue(
                    comparison[1]
                );

            const right =
                this.cleanValue(
                    comparison[3]
                );

            switch (comparison[2]) {

                case ">":
                    return left > right;

                case "<":
                    return left < right;

                case ">=":
                    return left >= right;

                case "<=":
                    return left <= right;

                case "=":
                    return left == right;

                case "<>":
                    return left != right;
            }
        }

        // Convert quoted strings
        expression =
            expression.replace(
                /"([^"]*)"/g,
                (_, value) =>
                    `"${value}"`
            );

        // Basic arithmetic
        if (
            /^[0-9+\-*/().\s]+$/.test(
                expression
            )
        ) {

            return Function(
                `"use strict"; return (${expression})`
            )();
        }

        return this.cleanValue(
            expression
        );
    },


    /* -------------------------------
       ADDRESS HELPERS
    -------------------------------- */

    parseAddress(address) {

        const match =
            address
                .trim()
                .toUpperCase()
                .match(/^([A-Z]+)(\d+)$/);

        if (!match) {
            return null;
        }

        return {
            col: this.columnNumber(
                match[1]
            ),
            row: Number(match[2])
        };
    },


    columnNumber(column) {

        let number = 0;

        for (const char of column) {

            number =
                number * 26 +
                char.charCodeAt(0) -
                64;
        }

        return number;
    },


    columnName(number) {

        let name = "";

        while (number > 0) {

            const remainder =
                (number - 1) % 26;

            name =
                String.fromCharCode(
                    65 + remainder
                ) + name;

            number =
                Math.floor(
                    (number - 1) / 26
                );
        }

        return name;
    },


    cleanValue(value) {

        if (
            typeof value !== "string"
        ) {
            return value;
        }

        value = value.trim();

        if (
            value.startsWith('"') &&
            value.endsWith('"')
        ) {
            return value.slice(1, -1);
        }

        const number = Number(value);

        return Number.isNaN(number)
            ? value
            : number;
    }
};


/* ======================================
   AEGIS MODULE
====================================== */

Aegis.register("formulaEngine", {

    version: "1.0.0",

    init() {
        console.log(
            "Formula Engine initialized."
        );
    },

    refresh() {},

    shutdown() {
        console.log(
            "Formula Engine shutting down."
        );
    },

    status() {
        return {
            online: true,
            version: this.version
        };
    },

    calculate(formula, cells) {
        return FormulaEngine.calculate(
            formula,
            cells
        );
    }
});


window.FormulaEngine = FormulaEngine;