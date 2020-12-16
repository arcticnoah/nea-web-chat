// -= File Info =-
// Database class that creates/loads a database file with various useful
// functions that do common SQLite operations

// -= Import decelerations =-

const assert = require("assert");
const fs = require("fs");
const sqlite3 = require("sqlite3").verbose();
const debugUtils = require("./debug-utils");

// TODO: Remove row with column name and content
// TODO: Search table with column name and content
// TODO: Better ID system, since 'old' values get recycled

class Database {
    // Load the database from the given path
    initialise(path) {
        return new Promise((resolve, reject) => {
            this.folderPath = path.substring(0, path.lastIndexOf("/"));
            this.path = path;
            if (!fs.existsSync(this.folderPath)) {
                try {
                    // Try to create folder
                    fs.mkdirSync(this.folderPath, {recursive: true});
                } catch (err) {
                    // Can't create folder
                    throw err;
                }
            }
            this.db = new sqlite3.Database(this.path, (err) => {
                if (err) {
                    reject(err);
                } else {
                    debugUtils.colorConsole(
                        `Database`,
                        "Database object initialized"
                    );
                    resolve();
                }
            });
        });
    }

    //TODO: newConstraint(name, columnName, targetTable, )

    // Create table
    newTable(name, elements) {
        return new Promise((resolve, reject) => {
            this.ensureConnection();
            this.db.run(`CREATE TABLE ${name} ${elements}`, (err) => {
                if (err) {
                    reject(err);
                } else {
                    debugUtils.colorConsole(
                        `Database`,
                        `The table '${name}' has been created`
                    );
                    resolve();
                }
            });
        });
    }

    // Remove table
    removeTable(name) {
        return new Promise((resolve, reject) => {
            this.ensureConnection();
            this.db.run(`DROP TABLE ${name}`, (err) => {
                if (err) {
                    reject(err);
                } else {
                    debugUtils.colorConsole(
                        `Database`,
                        `The table, ${name}, has been removed`
                    );
                    resolve();
                }
            });
        });
    }

    // Create new row with data in table
    newRow(table, columns, data) {
        return new Promise((resolve, reject) => {
            this.ensureConnection();
            const sql = `INSERT INTO ${table} ${columns} VALUES ${data}`;
            this.db.run(sql, (err) => {
                if (err) {
                    reject(err);
                } else {
                    debugUtils.colorConsole(
                        `Database`,
                        `The row has been inserted into '${table}'`
                    );
                    resolve();
                }
            });
        });
    }

    // Remove row by id in table
    removeRowID(table, id) {
        return new Promise((resolve, reject) => {
            this.ensureConnection();
            this.db.run(`DELETE FROM ${table} WHERE rowid=?`, id, (err) => {
                if (err) {
                    reject(err);
                }
                debugUtils.colorConsole(
                    `Database`,
                    `The row in '${table}' with id: ${id} has been removed`
                );
                resolve();
            });
        });
    }

    // TODO: Better 'no result' output
    searchColumnValue(table, columnName, value) {
        return new Promise((resolve, reject) => {
            this.ensureConnection();
            this.db.all(
                `SELECT * FROM ${table} WHERE ${columnName}='${value}'`,
                (err, row) => {
                    if (err) {
                        reject(err);
                    }
                    debugUtils.colorConsole(
                        `Database`,
                        `The value: ${row} was found`
                    );
                    resolve(row);
                }
            );
        });
    }

    // TODO: Update database row function
    updateRow(table, columnID, id, newColumnName, newColumnValue) {
        return new Promise((resolve, reject) => {
            this.ensureConnection();
            this.db.all(
                `UPDATE ${table} SET ${newColumnName}='${newColumnValue}' WHERE ${columnID}='${id}'`, (err, row) => {
                    if (err) {
                        reject(err);
                    }
                    debugUtils.colorConsole(
                        `Database`,
                        `The row where '${columnID}' was: ${id} has been updated`
                    );
                    resolve(row);
                }
            );
        });
    }

    // Close database file
    close() {
        return new Promise((resolve, reject) => {
            this.ensureConnection();
            this.db.close((err) => {
                if (err) {
                    reject(err);
                } else {
                    debugUtils.colorConsole(
                        `Database`,
                        "Database connection is closed"
                    );
                }
            });
            delete this.db;
            delete this.path;
            resolve();
        });
    }

    // Check if connection to db exists
    ensureConnection() {
        assert(
            !!this.db,
            "[Database] ".yellow + "Database connection is already closed"
        );
    }
}

// -= Exports =-

exports.Database = Database;