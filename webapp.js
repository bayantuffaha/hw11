var http = require("http");
var url = require("url");
const { MongoClient } = require("mongodb");

const urlMongo =
  "mongodb+srv://user:user123@cluster0.utd5z.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const dbName = "Stock";

var port = process.env.PORT || 3000;

// Define the async function to handle database interactions
async function fetchResults(searchType, query) {
  var client;
  try {
    console.log("Connecting to MongoDB...");
    client = new MongoClient(urlMongo, { useUnifiedTopology: true });
    await client.connect();

    const dbo = client.db(dbName);
    const collection = dbo.collection("PublicCompanies");

    var theQuery = {};
    if (searchType == "ticker") {
      theQuery = { Ticker: query.trim() };
    } else if (searchType == "company") {
      theQuery = { Company: query.trim() };
    }

    const items = await collection.find(theQuery).toArray();
    return items;
  } catch (err) {
    console.error(err);
    throw err;
  } finally {
    if (client) {
      await client.close();
    }
  }
}

http
  .createServer(async function (req, res) {
    try {
      res.writeHead(200, { "Content-Type": "text/html" });
      const urlObj = url.parse(req.url, true);
      const path = urlObj.pathname;

      if (path == "/") {
        console.log("Serving the home page...");
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
      } else if (path == "/process" && req.method == "GET") {
        const queryObj = urlObj.query;
        const { searchType, query } = queryObj;

        const results = await fetchResults(searchType, query);

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
      }
    } catch (err) {
      console.error(err);
    }
  })
  .listen(port);
