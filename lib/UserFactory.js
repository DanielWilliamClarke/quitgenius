"use strict"

module.exports = class UserFactory {
  constructor(databaseConnection, currencyFormatter) {
    this.databaseConnection = databaseConnection
    this.currencyFormatter = currencyFormatter
  }

  GetProductsByUser(userID, callback) {
    const productItemSql =
      `SELECT 
        p.productName, 
        p.productPrice,
        IFNULL(d.percentage, 0) AS productPercentage 
      FROM product AS p
        INNER JOIN transaction AS t 
          ON p.productId = t.productId
        INNER JOIN user AS u
          ON t.userId = u.userId	
        LEFT JOIN discount as d
          ON u.userId = d.userid 
            AND p.productId = d.productId	
      WHERE u.userId = ?;`

    const cf = this.currencyFormatter;
    this.databaseConnection.query(productItemSql, [userID], (err, data) => {
      if (err) throw err;
      callback(data.map(d => {
        return {
          name: d.productName,
          price: cf.format(d.productPrice, {
            code: 'GBP'
          }),
          percentage: d.productPercentage
        };
      }));
    });
  }

  GetUserTotalSpend(userID, callback) {
    const productItemSql =
      `SELECT  
        SUM(p.productPrice * (1 - IFNULL(d.percentage, 1) / 100)) as totalSpent
      FROM product AS p
        INNER JOIN transaction AS t 
        ON p.productId = t.productId
       INNER JOIN user AS u
        ON t.userId = u.userId	
      LEFT JOIN discount as d
        ON u.userId = d.userid 
          AND p.productId = d.productId	
      WHERE u.userId = ?;`

    const cf = this.currencyFormatter;
    this.databaseConnection.query(productItemSql, [userID], (err, data) => {
      if (err) throw err;
      callback(data.map(d => cf.format(d.totalSpent, {
        code: 'USD'
      })));
    });
  }

  GetSalaryPaymentsByUser(userID, callback) {
    const salaryItemSql =
      `SELECT  
        s.amount,
        s.timestamp
      FROM salary AS s
        INNER JOIN user AS u
          ON s.userId = u.userId	
      WHERE u.userId = ?
      ORDER BY s.timestamp ASC;`

    const cf = this.currencyFormatter;
    this.databaseConnection.query(salaryItemSql, [userID], (err, data) => {
      if (err) throw err;
      callback(data.map(d => {
        return {
          amount: cf.format(d.amount, {
            code: 'GBP'
          }),
          timestamp: d.timestamp
        };
      }));
    })
  }

  GetUserTotalSalaried(userID, callback) {
    const salaryItemSql =
      `SELECT  
        SUM(s.amount) AS totalPaid
       FROM salary AS s
        INNER JOIN user AS u
          ON s.userId = u.userId	
      WHERE u.userId = ?
      ORDER BY s.timestamp ASC;`

    const cf = this.currencyFormatter;
    this.databaseConnection.query(salaryItemSql, [userID], (err, data) => {
      if (err) throw err;
      callback(data.map(d => cf.format(d.totalPaid, {
        code: 'GBP'
      })));
    });
  }

  GetUserNetBalance(userID, callback) {
    const salaryItemSql =
      `SELECT  
        SUM(s.amount) as totalPaid,
        SUM(p.productPrice) as totalBought,
        SUM(s.amount) - SUM(p.productPrice * (1 - IFNULL(d.percentage, 1) / 100)) as netBalance
       FROM salary AS s
        INNER JOIN user AS u
          ON s.userId = u.userId	
        INNER JOIN transaction AS t
          ON t.userId = u.userId	
        INNER JOIN product AS p
          ON t.productId = p.productId	
        LEFT JOIN discount as d
          ON u.userId = d.userid 
            AND p.productId = d.productId	
      WHERE u.userId = ?`

    const cf = this.currencyFormatter;
    this.databaseConnection.query(salaryItemSql, [userID], (err, data) => {
      if (err) throw err;
      callback(data.map(d => {
        return {
          paid: cf.format(d.totalPaid, {
            code: 'GBP'
          }),
          bought: cf.format(d.totalBought, {
            code: 'GBP'
          }),
          netBalance: cf.format(d.netBalance, {
            code: 'GBP'
          }),
        };
      }));
    });
  }

  GetUserWhoseBalanceIsGreaterThan(amount, callback) {
    const salaryItemSql =
      `SELECT  
      u.userName,
      u.userEmail,
      SUM(s.amount) - SUM(p.productPrice * (1 - IFNULL(d.percentage, 1) / 100)) as netBalance
      FROM salary AS s
      INNER JOIN user AS u
        ON s.userId = u.userId	
      INNER JOIN transaction AS t
        ON t.userId = u.userId	
      INNER JOIN product AS p
        ON t.productId = p.productId
      LEFT JOIN discount as d
        ON u.userId = d.userid 
				  AND p.productId = d.productId	
      GROUP BY u.userId
      ORDER BY u.userId`

    const cf = this.currencyFormatter;
    this.databaseConnection.query(salaryItemSql, [amount], (err, data) => {
      if (err) throw err;

      var filteredUsers = data.filter(d => d.netBalance > amount).map(d => {
        return {
          userName: d.userName,
          userEmail: d.userEmail,
          netBalance: cf.format(d.netBalance, {
            code: 'GBP'
          })
        }
      });

      callback(filteredUsers);
    });
  }
}
