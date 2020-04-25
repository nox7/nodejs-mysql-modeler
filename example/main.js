const mysql2 = require("mysql2/promise");

(async () => {
	const mysqlConnection = await mysql2.createConnection({
		host:"localhost",
		user:"root",
		database:"test"
	});
	const modeler = new MySQLModeler(mysqlConnection);

	// Sync models
	modeler.sync(require("./models/accounts"));
})();
