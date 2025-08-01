const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 8000; 

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Hello from the backend server!" });
});


const puppeteer = require('puppeteer'); 

app.post('/scrape', async (req, res) => {
  const { url } = req.body; // Get the URL from the request body

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  console.log(`Scraping URL: ${url}`);

  let browser;
  try {
    // Launch a new browser instance
    browser = await puppeteer.launch();
    
    // Open a new page
    const page = await browser.newPage();
    
    // Navigate to the URL and wait for the page to load
    await page.goto(url, { waitUntil: 'networkidle2' });
    
    // Extract the text content from the page's body
    const textContent = await page.evaluate(() => document.body.innerText);
    
    // Send the extracted text back to the client
    res.json({ text: textContent });

  } catch (error) {
    console.error('Scraping failed:', error);
    res.status(500).json({ error: 'Failed to scrape the website.' });
  } finally {
    // Ensure the browser is closed even if an error occurs
    if (browser) {
      await browser.close();
    }
  }
});


app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
