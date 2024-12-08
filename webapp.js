var http = require("http");
var url = require("url");
const MongoClient = require("mongodb").MongoClient;

const urlMongo =
  "mongodb+srv://user:user123@cluster0.utd5z.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const dbName = "Stock";

http
  .createServer(function (req, res) {
    res.writeHead(200, { "Content-Type": "text/html" });
    urlObj = url.parse(req.url, true);
    path = urlObj.pathname;
    if (path == "/") {
      res.write(`
            <h1>Search for a Stock</h1>
            <form action="/process" method="GET">
                <label>
                    <input type="radio" name="searchType" value="ticker" checked>
                    Search by Ticker Symbol
                </label><br>
                <label>
                    <input type="radio" name="searchType" value="company">
                    Search by Company Name
                </label><br>
                <input type="text" name="query" placeholder="Enter your search term" required>
                <button type="submit">Search</button>
            </form>
        `);
    } else if ((path = "/process" && req.method == "GET")) {
      var queryObj = url.parse(req.url, true).query;
      var { searchType, query } = queryObj;
      MongoClient.connect(urlMongo, function (err, db) {
        if (err) {
          return console.log(err);
        }

        var dbo = db.db(dbName);
        var collection = dbo.collection("PublicCompanies");

        var theQuery = {};
        if (searchType == "ticker") {
          theQuery = { Ticker: query.trim() };
        } else if (searchType == "company") {
          theQuery = { Company: query.trim() };
        }

        collection.find(theQuery).toArray((err, results) => {
          if (err) {
            return console.log(err);
          }

          res.writeHead(200, { "Content-Type": "text/html" });
          res.write("<h1>Search Results</h1>");
          if (results.length === 0) {
            res.write("<p>No results found.</p>");
          } else {
            results.forEach((doc) => {
              res.write(
                `<p>Company: ${doc.Company}, Ticker: ${
                  doc.Ticker
                }, Price: $${doc.Price.toFixed(2)}</p>`
              );
            });
          }
          res.end();
          db.close();
        });
      });
    }
  })
  .listen(8080);
