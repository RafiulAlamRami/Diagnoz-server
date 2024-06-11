const express = require('express')
const app = express()
const cors = require('cors')
const jwt = require('jsonwebtoken')
require('dotenv').config()
// const stripe=require('stripe')(process.env.STRIPE_SECRET_KEY)
const port = process.env.PORT || 5000

// middleware

app.use(cors())
app.use(express.json())



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jvi5uyr.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection

    const upazilaCollection=client.db("diagnozdb").collection("upazila");
    const districtCollection=client.db("diagnozdb").collection("district");


    const userCollection = client.db("diagnozdb").collection("users");

    // ------ bd geo location api start-------------

      // upozila api
      app.get('/upazila',async(req,res)=>{
        const result=await upazilaCollection.find().toArray()
        res.send(result)
      }) 
  
        // district api
      app.get('/district',async(req,res)=>{
        const result=await districtCollection.find().toArray()
        res.send(result)
      }) 
  
    // ------ bd geo location api end-------------

    // -----jwt related api start-----

      //jwt create
    app.post('/jwt', async (req, res) => {
      const user = req.body
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
      res.send({ token })
    })

      // verify jwt
    const verifyToken = (req, res, next) => {
      // console.log("inside verify token : ", req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'unathorized access' })
      }
      const token = req.headers.authorization.split(' ')[1]
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'unathorized access' })
        }
        req.decoded = decoded
        next()
      })
      // next()
    }



    // -----jwt related api end-----


    //----- admin api start------

  // verify admin
  const verifyAdmin=async(req,res,next)=>{
    const email=req.decoded.email
    const query={email:email}
    const user=await userCollection.findOne(query)
    const isAdmin=user?.role==='admin'
    if(!isAdmin){
      return res.status(403).send({message:'forbidden access'})
    }
    next()
  }

    //make admin api
  app.patch('/users/admin/:id',verifyToken,verifyAdmin, async (req, res) => {
    const id = req.params.id
    const filter = { _id:new ObjectId(id) }
    const updateDoc = {
      $set: {
        role: 'admin'
      }
    }
    const result = await userCollection.updateOne(filter, updateDoc)
    res.send(result)
  })

    // check admin or get admin api
  app.get('/users/admin/:email',verifyToken, async (req, res) => {
    const email = req.params.email
    if (email !== req.decoded.email) {
      return res.status(403).send({ message: 'forbidden access' })
    }

    const query = { email: email }
    const user = await userCollection.findOne(query)
    let admin = false
    if (user) {
      admin = user?.role === 'admin'
    }
    res.send({ admin })
  })

    // get all users
  app.get('/users',verifyToken, async (req, res) => {
    // console.log(req.headers);
    const result = await userCollection.find().toArray()
    res.send(result)
  })


  // -----admin api end-----


    // -----user api start-----

      // added new user info in database
    app.post('/users', async (req, res) => {
      const user = req.body
      const query = { email: user.email }
      const existingUser = await userCollection.findOne(query)
      if (existingUser) {
        return res.send({ message: "User already exist.", insertedId: null })
      }
      const result = await userCollection.insertOne(user)
      res.send(result)
    })


// -----user api end-----


    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Bistro is running')
})

app.listen(port, () => {
  console.log(`bistro is running from ${port} port`);
})