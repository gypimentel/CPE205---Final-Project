const express = require('express')
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');

const app = express()
const database = require('./database')

app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs')

// RENDER HOMEPAGE

app.get('/', async (req, res) => {
  try {
      const totalSales = await database.getTotalProfitForToday();
      const productsLowStock = await database.getProductsLowStock(); // Fetch products in low stock from database
      
      res.render("index.ejs", { totalSales, productsLowStock });
  } catch (error) {
      console.error("Error fetching total sales:", error);
      res.status(500).send("Internal Server Error");
  }
});

// RENDER LOGIN PAGE
const loginRouter = require('./routes/login');
app.use('/login', loginRouter);

// RENDER REGISTER PAGE
const registerRouter = require('./routes/register');
app.use('/register', registerRouter);

// PRODUCTS ROUTES
const productsRoute = require('./routes/products');
app.use('/products', productsRoute);

// INVENTORY ROUTES
const inventoryRoute = require('./routes/inventory');
app.use('/inventory', inventoryRoute);

// SALES ROUTES
const salesRoute = require('./routes/sales');
app.use('/sales', salesRoute);

app.use(express.static("public"))

const port = 8080
app.listen(port, () => {
  console.log(`Server listening on port ${port}`)
})