var http = require("http");
var url = require("url");
const MongoClient = require("mongodb").MongoClient;

const urlMongo =
  "mongodb+srv://user:user123@cluster0.utd5z.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const dbName = "Stock";

var port = process.env.PORT || 3000;

http
  .createServer(function (req, res) {
    const urlObj = url.parse(req.url, true);
    const path = urlObj.pathname;

    if (path === "/favicon.ico") {
      res.writeHead(204); // No Content
      res.end();
      return;
    }

    if (path === "/" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "text/html" });
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
      res.end();
    } else if (path === "/process" && req.method === "GET") {
      const { searchType, query } = urlObj.query;

      if (!searchType || !query) {
        res.writeHead(400, { "Content-Type": "text/html" });
        res.write("<h1>400 Bad Request</h1>");
        res.end();
        return;
      }

      MongoClient.connect(urlMongo, { useUnifiedTopology: true }, function (err, client) {
        if (err) {
          console.error("Database connection error:", err);
          res.writeHead(500, { "Content-Type": "text/html" });
          res.write("<h1>500 Internal Server Error</h1>");
          res.end();
          return;
        }

        const db = client.db(dbName);
        const collection = db.collection("PublicCompanies");

        const theQuery =
          searchType === "ticker"
            ? { Ticker: query.trim() }
            : { Company: { $regex: new RegExp(query.trim(), "i") } };

        const timeout = setTimeout(() => {
          res.writeHead(503, { "Content-Type": "text/html" });
          res.write("<h1>503 Service Unavailable</h1>");
          res.end();
          client.close();
        }, 29000); // Avoid Heroku's 30-second timeout

        collection.find(theQuery).toArray((err, results) => {
          clearTimeout(timeout); // Clear timeout if operation completes
          if (err) {
            console.error("Query error:", err);
            res.writeHead(500, { "Content-Type": "text/html" });
            res.write("<h1>500 Internal Server Error</h1>");
            res.end();
            client.close();
            return;
          }

          res.writeHead(200, { "Content-Type": "text/html" });
          res.write("<h1>Search Results</h1>");
          if (results.length === 0) {
            res.write("<p>No results found.</p>");
          } else {
            results.forEach((doc) => {
              res.write(
                `<p>Company: ${doc.Company}, Ticker: ${doc.Ticker}, Price: $${doc.Price.toFixed(2)}</p>`
              );
            });
          }
          res.end();
          client.close();
        });
      });
    } else {
      res.writeHead(404, { "Content-Type": "text/html" });
      res.write("<h1>404 Not Found</h1>");
      res.end();
    }
  })
  .listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
