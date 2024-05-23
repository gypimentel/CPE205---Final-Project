const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '1234',
  database: 'pos_db'
});


// Function to create a user
const createUser = async (username, password) => {
  if (!username || !password) {
    throw new Error('All fields are required.');
  }

  console.log("Creating user with:", { username, password });

  try {

    // Insert the new user into the database
    const query = 'INSERT INTO users (username, password) VALUES (?, ?)';
    const [result] = await pool.query(query, [username, password]);

    console.log("User created successfully:", result);
  } catch (error) {
    console.error("Error creating user:", error);
    throw new Error('Error creating user: ' + error.message);
  }
};

// Function to find a user by username
async function findUserByUsername(username) {
  try {
    const query = 'SELECT * FROM users WHERE username = ?';
    const [rows] = await pool.query(query, [username]);

    return rows[0]
  } catch (error) {
    console.error("Error finding user by username:", error);
    throw error;
  }
}

async function getProducts() {
  try {
    const [rows] = await pool.query("SELECT * FROM products;");
    return rows;
  } catch (error) {
    console.error("Error fetching products:", error);
    return [];
  }
}

async function addProduct(name, description, price, category, quantity) {
  try {
    const query = "INSERT INTO products (name, description, price, category, quantity) VALUES (?, ?, ?, ?, ?)";
    const [result] = await pool.execute(query, [name, description, price, category, quantity]);
    return result.insertId; 
  } catch (error) {
    console.error("Error adding product:", error);
    throw error; 
  }
}

async function deleteProduct(productId) {
  try {
    const query = "DELETE FROM products WHERE product_id = ?";
    const [result] = await pool.execute(query, [productId]);
    if (result.affectedRows === 0) {
      throw new Error(`Product with ID ${productId} not found`);
    }
    console.log(`Product with ID ${productId} deleted successfully`);
  } catch (error) {
    console.error("Error deleting product:", error);
    throw error; 
  }
}

async function getProductById(productId) {
  try {
    const query = "SELECT * FROM products WHERE product_id = ?";
    const [result] = await pool.execute(query, [productId]);
    if (result.length === 0) {
      throw new Error(`Product with ID ${productId} not found`);
    }
    return result[0]; 
  } catch (error) {
    console.error("Error fetching product:", error);
    throw error; 
  }
}

async function editProduct(productId, newData) {
  try {
    if (!newData) {
      throw new Error("New data for product update is missing");
    }

    const { name, description, price, category, quantity } = newData;

    const updatedName = name || "";
    const updatedDescription = description || "";
    const updatedPrice = price || 0;
    const updatedCategory = category || "";
    const updatedQuantity = quantity || 0;

    const query = "UPDATE products SET name = ?, description = ?, price = ?, category = ?, quantity = ? WHERE product_id = ?";
    const [result] = await pool.execute(query, [updatedName, updatedDescription, updatedPrice, updatedCategory, updatedQuantity, productId]);
    if (result.affectedRows === 0) {
      throw new Error(`Product with ID ${productId} not found`);
    }
    console.log(`Product with ID ${productId} edited successfully`);
  } catch (error) {
    console.error("Error editing product:", error);
    throw error; 
  }
}

async function getStatus() {
  try {
    const [rows] = await pool.query("SELECT * FROM products");
    const productsWithStatus = rows.map(product => {
      const status = product.quantity <= 100 ? "Low stock" : "High stock";
      return { ...product, status };
    });
    return productsWithStatus;
  } catch (error) {
    console.error("Error fetching stock status:", error);
    throw error;
  }
}

async function getProductsLowStock() {
  try {
    const [rows] = await pool.query("SELECT * FROM products WHERE quantity <= 100");
    return rows;
  } catch (error) {
    console.error("Error fetching products with low stock:", error);
    throw error;
  }
}

async function increaseStock(productId) {
  try {
    const query = "UPDATE products SET quantity = quantity + 1 WHERE product_id = ?;";
    const [result] = await pool.execute(query, [productId]);
    if (result.affectedRows === 0) {
      throw new Error(`Product with ID ${productId} not found`);
    }
    console.log(`Stock with ID ${productId} increased successfully`);
  } catch (error) {
    console.error("Error increasing product:", error);
    throw error; 
  }
}

async function decreaseStock(productId) {
  try {
    const query = "UPDATE products SET quantity = quantity - 1 WHERE product_id = ?;";
    const [result] = await pool.execute(query, [productId]);
    if (result.affectedRows === 0) {
      throw new Error(`Product with ID ${productId} not found`);
    }
    console.log(`Stock with ID ${productId} decreased successfully`);
  } catch (error) {
    console.error("Error decreasing product:", error);
    throw error; 
  }
}

//SALES

async function getSales() {
  try {
    const query = `
      SELECT sales.*, products.name AS product_name
      FROM sales
      INNER JOIN products ON sales.product_id = products.product_id;
    `;
    const [rows] = await pool.query(query);
    return rows;
  } catch (error) {
    console.error("Error fetching sales:", error);
    return [];
  }
}


async function recordSale(productId, quantity) {
  try {
    // Start a transaction
    await pool.query('START TRANSACTION');

    // Fetch product quantity and price
    const [productResults] = await pool.query('SELECT quantity, price FROM products WHERE product_id = ?', [productId]);
    
    if (productResults.length === 0) {
      throw new Error('Product not found');
    }

    const availableQuantity = productResults[0].quantity;
    const pricePerUnit = productResults[0].price;

    if (availableQuantity < quantity) {
      throw new Error('Insufficient quantity available');
    }

    const totalPrice = pricePerUnit * quantity;
    const totalProfit = totalPrice.toFixed(2); // Round to 2 decimal places

    // Insert into sales
    await pool.query(
      'INSERT INTO sales (product_id, quantity_sold, sale_date, total_profit) VALUES (?, ?, NOW(), ?)',
      [productId, quantity, totalProfit]
    );

    const updatedQuantity = availableQuantity - quantity;

    // Update product quantity
    await pool.query('UPDATE products SET quantity = ? WHERE product_id = ?', [updatedQuantity, productId]);

    // Commit the transaction
    await pool.query('COMMIT');

    console.log(`Sale recorded and stock updated for product ID ${productId}`);
  } catch (error) {
    // Rollback the transaction in case of error
    await pool.query('ROLLBACK');
    console.error('Error during recordSale:', error.message);
    throw error;
  }
}

// Delete a sale by saleId
async function deleteSale(saleId) {
  try {
      const query = "DELETE FROM sales WHERE sale_id = ?";
      const [result] = await pool.execute(query, [saleId]);
      if (result.affectedRows === 0) {
          throw new Error(`Sale with ID ${saleId} not found`);
      }
      console.log(`Sale with ID ${saleId} deleted successfully`);
  } catch (error) {
      console.error("Error deleting sale:", error);
      throw error;
  }
}

// Fetch a sale by saleId
async function getSaleById(saleId) {
  try {
      const query = "SELECT * FROM sales WHERE sale_id = ?";
      const [result] = await pool.execute(query, [saleId]);
      if (result.length === 0) {
          throw new Error(`Sale with ID ${saleId} not found`);
      }
      return result[0];
  } catch (error) {
      console.error("Error fetching sale:", error);
      throw error;
  }
}

async function editSale(saleId, newData) {
  try {
    const { quantity_sold } = newData;

    const productQuery = "SELECT products.price FROM sales INNER JOIN products ON sales.product_id = products.product_id WHERE sales.sale_id = ?";
    const [productResult] = await pool.execute(productQuery, [saleId]);
    if (productResult.length === 0) {
      throw new Error(`Product not found for sale with ID ${saleId}`);
    }
    const price = productResult[0].price;

    const totalProfit = price * quantity_sold;

    const query = "UPDATE sales SET quantity_sold = ?, total_profit = ? WHERE sale_id = ?";
    const [result] = await pool.execute(query, [quantity_sold, totalProfit, saleId]);

    if (result.affectedRows === 0) {
      throw new Error(`Sale with ID ${saleId} not found`);
    }

    console.log(`Sale with ID ${saleId} updated successfully`);
  } catch (error) {
    console.error("Error updating sale:", error);
    throw error;
  }
}

async function getTotalSalesForToday() {
  try {
    const query = `
      SELECT SUM(quantity_sold) AS total_sales
      FROM sales
      WHERE DATE(sale_date) = CURDATE() AND HOUR(sale_date) = HOUR(NOW());
    `;
    
    const [rows] = await pool.query(query);
    const totalSales = rows[0].total_sales || 0; 
    return totalSales;
  } catch (error) {
    console.error("Error fetching total sales for today:", error);
    throw error;
  }
}

async function getTotalProfitForToday() {
  try {
    const query = `
      SELECT SUM(total_profit) AS total_profit
      FROM sales
      WHERE DATE(sale_date) = CURDATE();
    `;
    const [rows] = await pool.query(query);
    const totalProfit = rows[0].total_profit || 0;
    return totalProfit;
  } catch (error) {
    console.error("Error fetching total profit for today:", error);
    throw error;
  }
}

module.exports = { 
  createUser,
  findUserByUsername,
  
  getProducts,
  addProduct, 
  deleteProduct,
  editProduct,
  getProductById,

  getStatus,
  getProductsLowStock,
  increaseStock,
  decreaseStock,
  
  getSales, 
  recordSale,
  deleteSale,
  getSaleById,
  editSale,
  getTotalSalesForToday,
  getTotalProfitForToday
};