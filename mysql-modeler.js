/**
* A simple, basic MySQL modeler that synchronizes models to a MySQL database
* This class requires the constructor to be called with a (mysql2/promise).createConnection result
*/
class MySQLModeler{

	/**
	* Accepts a mysql connection from mysql2.createConnection function (using "mysql2/promise" library)
	* @param {MySQL2Connection}
	*/
	constructor(mysql2Connection){
		this.connection = mysql2Connection;
	}

	/**
	* Synchronizes a table object
	* This object should have the following keys
	* name, charset, collation, columns, engine
	*
	* Columns should have the following keys
	* name, type, isNull, defaultValue, autoIncrement, isPrimaryKey
	* @param {object} table
	* @return {undefined}
	*/
	async sync(table){
		// Check if the table exists
		if (await this.tableExists(table.name)){
			// Sync all columns and column data
			let primaryKeyToBeSet = ""; // Name of the column to make a primary key
			for (let column of table.columns){
				const existingColumn = await this.getColumn(table.name, column.name);
				if (existingColumn === null){
					// Needs to be created
					this.createColumn(table.name, column);
				}else{
					// Change the column to match any possible new values
					let columnDefinition = this.getColumnDefinitionString(column);

					if ("isPrimaryKey" in column){
						if (column.isPrimaryKey){
							primaryKeyToBeSet = column.name;
						}
					}

					await this.connection.query(`
						ALTER TABLE \`${table.name}\`
						CHANGE COLUMN \`${column.name}\` \`${column.name}\` ${columnDefinition}
					`);
				}
			}

			if (primaryKeyToBeSet !== ""){
				// Make primary key
				await this.connection.query(`
					ALTER TABLE \`${table.name}\`
					DROP PRIMARY KEY,
					ADD PRIMARY KEY(\`${primaryKeyToBeSet}\`)
				`);
			}

			// Update character set, engine, and collation
			await this.connection.query(`
				ALTER TABLE \`${table.name}\`
				ENGINE = ${table.engine}
				DEFAULT CHARACTER SET = ${table.charset}
				COLLATE = ${table.collation}
			`);
		}else{
			// Table doesn't exist, create it
			// Get column definitions
			let columnString = "";
			let primaryKeyColumn = "";
			for (let column of table.columns){
				let columnDefinition = this.getColumnDefinitionString(column);
				columnString += `\`${column.name}\` ${columnDefinition}`;

				if ("isPrimaryKey" in column){
					if (column.isPrimaryKey === true){
						primaryKeyColumn = column.name;
					}
				}
			}

			await this.connection.query(`
				CREATE TABLE \`${table.name}\`
				(${columnString})
				ENGINE = ${table.engine}
				DEFAULT CHARACTER SET = ${table.charset}
				COLLATE = ${table.collation}
			`);

			if (primaryKeyColumn !== ""){
				await this.connection.query(`
					ALTER TABLE \`${table.name}\`
					DROP PRIMARY KEY,
					ADD PRIMARY KEY(\`${primaryKeyColumn}\`)
				`);
			}
		}
	}

	/**
	* Gets the definition query portion of a column
	* @param {column}
	* @return {string}
	*/
	getColumnDefinitionString(column){
		let sqlNullString = ("isNull" in column && column.isNull) ? "NULL" : "NOT NULL";
		let defaultValue;
		let autoIncrement = ("autoIncrement" in column && column.autoIncrement) ? " AUTO_INCREMENT" : "";

		if ("defaultValue" in column){
			defaultValue = "DEFAULT ";
			if (column.defaultValue === null){
				defaultValue += "NULL";
			}else if (typeof column.defaultValue === "number"){
				defaultValue += `${column.defaultValue}`;
			}else if (typeof column.defaultValue === "string"){
				defaultValue += `"${column.defaultValue}"`;
			}
		}

		if (defaultValue !== undefined){
			return `${column.type} ${sqlNullString} ${defaultValue} ${autoIncrement}`;
		}else{
			return `${column.type} ${sqlNullString} ${autoIncrement}`;
		}
	}

	/**
	* Creates a column in the table
	* @param {string} tableName
	* @param {object} column
	* @return {undefined}
	*/
	async createColumn(tableName, column){

		const columnDefinition = this.getColumnDefinitionString(column);

		await this.connection.query(`
			ALTER TABLE \`${tableName}\`
			ADD \`${column.name}\` ${columnDefinition}
		`);

		if (column.isPrimaryKey){
			await this.connection.query(`
				ALTER TABLE \`${tableName}\`
				DROP PRIMARY KEY
				ADD PRIMARY KEY(\`${column.name}\`)
			`);
		}
	}

	/**
	* Gets a column from the database belonging in the tableName
	* @param {string} tableName
	* @param {string} columnName
	* @return {object|null}
	*/
	async getColumn(tableName, columnName){
		const result = await this.connection.execute(`SHOW COLUMNS FROM \`${tableName}\` WHERE \`Field\` = ?`, [columnName]);
		// The 0th result is the one we want. It _can_ be empty
		const columnsResult = result[0];
		if (columnsResult.length === 0){
			return null;
		}else{
			// The 0th result of the columnsResult is the column's row
			// It has these keys
			// Field, Type (ie, varchar(128)), Null (string YES or NO), Key (string PRI), Default (value or null)
			// and Extra (ie, auto_increment)
			return columnsResult[0];
		}
	}

	/**
	* Checks if a table exists
	* @param {string} tableName
	* @return {bool}
	*/
	async tableExists(tableName){
		try{
			await this.connection.query(`SELECT 1 FROM \`${tableName}\` LIMIT 1`);
			return true;
		}catch(mysqlError){
			return false;
		}
	}
}

module.exports = MySQLModeler;
