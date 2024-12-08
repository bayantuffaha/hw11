var http = require("http");
var url = require("url");
const { MongoClient } = require("mongodb");

const urlMongo =
  "mongodb+srv://user:user123@cluster0.utd5z.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const dbName = "Stock";

var port = process.env.PORT || 3000;

// Define the async function to handle database interactions
async function fetchResults(searchType, query) {
  let client;
  try {
    console.log("Connecting to MongoDB...");
    client = new MongoClient(urlMongo, { useUnifiedTopology: true });
    await client.connect();

    const dbo = client.db(dbName);
    const collection = dbo.collection("PublicCompanies");

    let theQuery = {};
    if (searchType == "ticker") {
      theQuery = { Ticker: query.trim() };
    } else if (searchType == "company") {
      theQuery = { Company: query.trim() };
    }

    console.log("Running query:", theQuery);
    const items = await collection.find(theQuery).toArray();
    console.log("Query results:", items);
    return items;
  } catch (err) {
    console.error("Database error:", err);
    throw err;
  } finally {
    if (client) {
      await client.close();
      console.log("MongoDB connection closed.");
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
        console.log("Processing search request...");
        const queryObj = urlObj.query;
        const { searchType, query } = queryObj;

        console.log("Fetching results...");
        const results = await fetchResults(searchType, query);

        console.log("Preparing search results...");
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
      }
    } catch (err) {
      console.error("Error occurred during request handling:", err);
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "text/html" });
        res.write("<h1>500 Internal Server Error</h1>");
        res.end();
      }
    }
  })
  .listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
