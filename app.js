const http = require('http');
const express = require('express');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const fetch = require('node-fetch');

dotenv.config();

const BigCommerce = require('node-bigcommerce');
const bigCommerce = new BigCommerce({
  clientId: process.env.CLIENTID,
  accessToken: process.env.ACCESSTOKEN,
  storeHash: process.env.STOREHASH,
  responseType: 'json',
});

const app = express();

app.use(bodyParser.json());
bigCommerce.get('/hooks').then((data) => {
  let webhooks = data;
  let scopes = webhooks.map((a) => a.scope);
  const hookBody = {
    scope: 'store/product/updated',
    destination: `https://${process.env.NGROKHASH}.ngrok.io/webhooks`,
    is_active: true,
  };

  console.log(scopes);

  if (
    scopes.indexOf('store/product/updated') > -1 ||
    scopes.indexOf('store/product/*') > -1
  ) {
    console.log('Product webhook already exists');
  } else {
    bigCommerce.post('/hooks', hookBody).then((data) => {
      console.log('Product webhook created');
    });
  }
});

app.post('/webhooks', function (req, res) {
  res.send('OK');
  let webhook = req.body;
  let productId = webhook.data.id;
  console.log(productId);
  bigCommerce.get(`/products/${productId}`).then(async (data) => {
    console.log(data);
    const {
      id,
      sku,
      name: title,
      meta_description: description,
      date_modified,
      primary_image: { thumbnail_url: image_url },
      categories
    } = data;

    console.log(data);
    const body = [
      {
        id: String(id),
        title,
        description,
        image_url,
        last_update: Date.parse(date_modified),
        blob: {
          title,
          description,
          sku,
        },
      },
    ];

    console.log('body ', body);
    try {
      const response = await fetch(process.env.PRISMICURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.PRISMICTOKEN}`,
        },
        body: JSON.stringify(body),
        redirect: 'follow',
      });
      console.log(response);
    } catch (error) {
      console.error(error);
    }
  });
});

http.createServer(app).listen(3000, () => {
  console.log('Express server listening on port 3000');
});
