require('babel-register')
const fetch = require('node-fetch')
// const app = require('./app')
const Koa = require('koa')
const Router = require('koa-router')
const cors = require('@koa/cors')
const koaBody = require('koa-body');


const app = new Koa()
const router = new Router()


const shops = {}

router.get('/shops', async ctx => {
  let codes = transformCodesToArray(ctx.query.codes) || []
  let fetchCodes = codes.filter(code => !shops.hasOwnProperty(code))

  if (fetchCodes) {
    let newShops = await getShopsInfo(fetchCodes)
    newShops.forEach(shop => {
      shops[shop.code] = shop
    })
  }
  ctx.body = Object.keys(shops)
    .filter(key => codes
      .includes(parseInt(key)))
      .map(code => shops[code]
    )
})


app
  .use(koaBody())
  .use(cors())
  .use(router.routes())
  .use(router.allowedMethods())

app.listen(3300)


function getShopsInfo(codes) {
  return Promise.all(codes.map(async code => await fetchShopInfo(code)))
}

async function fetchShopInfo(code, data=[], page=1, reviewsCount=0) {
  let shop = await fetch(`https://www.gearbest.com/store/list?shop_code=${code}&page=${page}`)
  shop = await shop.json()
  if (shop.data.length && page < 5)
    shop = await fetchShopInfo(
        code, 
        data.concat(shop.data), 
        ++page, 
        shop.data.reduce((sum, cur) => sum + parseInt(cur.reviewCount), reviewsCount)
      )
  else
    return {
      code,
      avgRating: calcAvg(data),
      goodsCount: data.length,
      reviewsCount
    }
  return shop
}


function calcAvg(data) {
  let total = data.reduce((total, item) => {
    let rating = item.agvRate
    return {
      count: rating ? ++total.count : total.count,
      sum: total.sum + rating
    }
  }, { count: 0, sum: 0 })
  return (total.sum / total.count).toFixed(1)
}

function transformCodesToArray(codes) {
  return codes.split(',').map(code => parseInt(code))
}