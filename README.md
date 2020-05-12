
# nodejs-mysql-modeler
A barebone, basic MySQL modeling library for NodeJS. Not an ORM. Uses the mysql2 package to synchronize models. Lightweight without unnecessary libraries, dependencies, or a huge library of functions. Just the basics.

Whenever you start your application, this will sync the database tables and columns that you have defined in your models. This way you don't have to manually create them, synchronize them, or manage them across release platforms.

## Basic User Account Model
```js
module.exports = {
	name:"user_accounts",
	engine:"InnoDB",
	charset:"utf8mb4",
	collation:"utf8mb4_unicode_ci",
	columns:[
		{
			name:"id",
			type:"int(11)",
			isNull:false,
			isPrimaryKey:true,
			autoIncrement:true
		},
		{
			name:"username",
			type:"varchar(64)"
		}
	]
}
```

## App Usage
In your NodeJS main application file (typically app.js) simply put code similar to this above your routes or any code that uses the database information.

```js
const MySQLModeler = require("mysql-modeler"); // Path to the main class
const mysql2 = require("mysql2/promise"); // NPM mysql2 package

(async () => {
	const mysqlConnection = await mysql2.createConnection({
		host:"localhost",
		user:"root",
		database:"test"
	});
	const modeler = new MySQLModeler(mysqlConnection);
	await modeler.sync(require("./models/account")); // Wherever the model for the account is (js file)
	mysqlConnection.close();
})();
```
