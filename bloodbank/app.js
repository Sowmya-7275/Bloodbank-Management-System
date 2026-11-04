// CRUD operations of donors, blood_stock and blood_requests tables of bloodbank database
/*
1. Create the database
   Run schema.sql in MySQL (creates the bloodbank database, the 3 tables and sample data)

2. Initialize PROJECT
>npm init -y
>npm install express mysql8
The first command creates package.json, the second installs express and mysql8

EXECUTION:
>node app.js
Open http://localhost:3000/
*/
const express = require("express");
const mysql = require("mysql8");
const app = express();
app.use(express.json());
// Read HTML files from public folder
app.use(express.static("public"));

//Connection establishment with bloodbank database
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "root",
    database: "bloodbank",
    dateStrings: true      // DATE columns are returned as 'YYYY-MM-DD' text
});

db.connect((err)=>{
    if(err)
        throw err;
    console.log("Connected to MySQL");
});

const GROUPS = ["A+","A-","B+","B-","AB+","AB-","O+","O-"];

/*
 Builds the 5 standard routes (GET all, GET one, POST, PUT, DELETE) for one table.
   route : URL path, e.g. "/donors"
   table : table name
   pk    : primary key column
   cols  : the other columns that come from the form
   auto  : columns filled by SQL itself, e.g. { last_updated: "CURDATE()" }
*/
function crud(route, table, pk, cols, auto = {}) {
    const autoCols = Object.keys(auto);

    //TO GET DETAILS OF ALL RECORDS
    app.get(route, (req, res) => {
        db.query(`SELECT * FROM ${table}`, (err, result) => {
            if (err) { res.status(500).send(err.message); return; }
            res.json(result);
        });
    });

    //TO GET THE DETAILS OF ONE RECORD
    app.get(route + "/:id", (req, res) => {
        db.query(`SELECT * FROM ${table} WHERE ${pk}=?`, [req.params.id], (err, result) => {
            if (err) { res.status(500).send(err.message); return; }
            res.json(result);
        });
    });

    //TO INSERT DATA INTO THE TABLE
    app.post(route, (req, res) => {
        const names  = [pk, ...cols, ...autoCols];
        const marks  = [ "?", ...cols.map(() => "?"), ...autoCols.map(c => auto[c]) ];
        const values = [req.body[pk], ...cols.map(c => req.body[c])];
        db.query(
            `INSERT INTO ${table}(${names.join(", ")}) VALUES(${marks.join(",")})`,
            values,
            (err) => {
                if (err) { res.status(500).send(err.message); return; }
                res.send("Record Inserted");
            });
    });

    //TO UPDATE DETAILS
    app.put(route + "/:id", (req, res) => {
        const sets   = [...cols.map(c => `${c}=?`), ...autoCols.map(c => `${c}=${auto[c]}`)];
        const values = [...cols.map(c => req.body[c]), req.params.id];
        db.query(
            `UPDATE ${table} SET ${sets.join(", ")} WHERE ${pk}=?`,
            values,
            (err, result) => {
                if (err) { res.status(500).send(err.message); return; }
                if (result.affectedRows == 0)
                    res.status(404).send("Record NOT found");
                else
                    res.send("Record Updated");
            });
    });

    //TO DELETE DETAILS
    app.delete(route + "/:id", (req, res) => {
        db.query(`DELETE FROM ${table} WHERE ${pk}=?`, [req.params.id], (err, result) => {
            if (err) { res.status(500).send(err.message); return; }
            if (result.affectedRows == 0)
                res.status(404).send("Record NOT found to delete");
            else
                res.send("Record Deleted");
        });
    });
}

/* ---------- Blood requests: special rules (registered BEFORE crud so they win) ---------- */

//New requests cannot start as "Issued" - blood is issued from the update page so stock is reduced
app.post("/blood_requests", (req, res, next) => {
    if (req.body.status === "Issued") {
        res.status(400).send("Create the request as Pending, then set it to Issued from Update Request.");
        return;
    }
    next();
});

//TO UPDATE A REQUEST. Changing status to "Issued" reduces blood_stock; leaving "Issued" gives the units back
app.put("/blood_requests/:id", (req, res) => {
    const { hospital_name, blood_group, units_required, request_date, status } = req.body;
    const units = Number(units_required);
    if (!Number.isInteger(units) || units < 1) { res.status(400).send("Units required must be at least 1"); return; }
    if (!GROUPS.includes(blood_group))         { res.status(400).send("Invalid blood group"); return; }

    db.beginTransaction((err) => {
        if (err) { res.status(500).send(err.message); return; }
        const fail = (code, msg) => db.rollback(() => res.status(code).send(msg));

        db.query("SELECT blood_group, units_required, status FROM blood_requests WHERE request_id=? FOR UPDATE",
            [req.params.id], (err, rows) => {
            if (err) return fail(500, err.message);
            if (rows.length == 0) return fail(404, "Request NOT found");
            const old = rows[0];

            // Step 1: if it was already issued, return those units to stock
            const restore = (next) => {
                if (old.status !== "Issued") return next();
                db.query("UPDATE blood_stock SET units_available=units_available+?, last_updated=CURDATE() WHERE blood_group=?",
                    [old.units_required, old.blood_group], (err) => err ? fail(500, err.message) : next());
            };
            // Step 2: if it is now issued, take the units out of stock (only when enough are available)
            const issue = (next) => {
                if (status !== "Issued") return next();
                db.query("UPDATE blood_stock SET units_available=units_available-?, last_updated=CURDATE() WHERE blood_group=? AND units_available>=?",
                    [units, blood_group, units], (err, result) => {
                    if (err) return fail(500, err.message);
                    if (result.affectedRows == 0)
                        return fail(400, "Insufficient stock: not enough " + blood_group + " units available to issue " + units + ".");
                    next();
                });
            };

            restore(() => issue(() => {
                db.query("UPDATE blood_requests SET hospital_name=?, blood_group=?, units_required=?, request_date=?, status=? WHERE request_id=?",
                    [hospital_name, blood_group, units, request_date, status, req.params.id], (err) => {
                    if (err) return fail(500, err.message);
                    db.commit((err) => {
                        if (err) return fail(500, err.message);
                        res.send(status === "Issued" ? "Request Updated and stock reduced" : "Request Updated");
                    });
                });
            }));
        });
    });
});

/* ---------- Standard CRUD for the three tables ---------- */
crud("/donors",         "donors",         "donor_id",   ["name", "age", "gender", "blood_group", "phone"]);
crud("/blood_stock",    "blood_stock",    "stock_id",   ["blood_group", "units_available"], { last_updated: "CURDATE()" });
crud("/blood_requests", "blood_requests", "request_id", ["hospital_name", "blood_group", "units_required", "request_date", "status"]);

//TO RECORD A DONATION: adds units to the stock of the donor's blood group
app.post("/donations", (req, res) => {
    const units = Number(req.body.units);
    if (!Number.isInteger(units) || units < 1) { res.status(400).send("Units must be a whole number of at least 1"); return; }

    db.query("SELECT blood_group FROM donors WHERE donor_id=?", [req.body.donor_id], (err, rows) => {
        if (err) { res.status(500).send(err.message); return; }
        if (rows.length == 0) { res.status(404).send("Donor NOT found"); return; }
        const group = rows[0].blood_group;

        db.query("UPDATE blood_stock SET units_available=units_available+?, last_updated=CURDATE() WHERE blood_group=?",
            [units, group], (err, result) => {
            if (err) { res.status(500).send(err.message); return; }
            if (result.affectedRows > 0) { res.json({ blood_group: group, units: units }); return; }

            // no stock row for this group yet - create one
            db.query("INSERT INTO blood_stock(stock_id, blood_group, units_available, last_updated) " +
                     "SELECT COALESCE(MAX(stock_id),0)+1, ?, ?, CURDATE() FROM blood_stock",
                [group, units], (err) => {
                if (err) { res.status(500).send(err.message); return; }
                res.json({ blood_group: group, units: units });
            });
        });
    });
});

//Server to listen on port number 3000
app.listen(3000,()=>{
    console.log("Server running at http://localhost:3000");
});
