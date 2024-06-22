const express = require('express')
const app = express()
const cors = require('cors')
const jwt = require('jsonwebtoken')
require('dotenv').config()
const stripe=require('stripe')(process.env.STRIPE_SECRET_KEY)
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
    // await client.connect();
    // Send a ping to confirm a successful connection

    const upazilaCollection=client.db("diagnozdb").collection("upazila");
    const districtCollection=client.db("diagnozdb").collection("district");
    const commingTestCollection=client.db("diagnozdb").collection("commingTest");
    const healthTipsCollection=client.db("diagnozdb").collection("helthTips");


    const userCollection = client.db("diagnozdb").collection("users");
    const testCollection = client.db("diagnozdb").collection("tests");
    const paymentCollection=client.db("diagnozdb").collection("payments");
    const bannerCollection=client.db("diagnozdb").collection("banners");
    

    // ------ general api start-------------

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

        // commingTest api
      app.get('/commingTest',async(req,res)=>{
        const result=await commingTestCollection.find().toArray()
        res.send(result)
      }) 

        // healthTips api
      app.get('/healthTips',async(req,res)=>{
        const result=await healthTipsCollection.find().toArray()
        res.send(result)
      }) 
  
    // ------ general api end-------------

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
  app.get('/users',verifyToken,verifyAdmin, async (req, res) => {
    // console.log(req.headers);
    const result = await userCollection.find().toArray()
    res.send(result)
  })

    // change user status active
  app.patch('/user-active/:id',verifyToken,verifyAdmin, async (req, res) => {
    const id = req.params.id
    const filter = { _id:new ObjectId(id) }
    const updateDoc = {
      $set: {
        status: 'active'
      }
    }
    const result = await userCollection.updateOne(filter, updateDoc)
    res.send(result)
  })

   // change user status block
  app.patch('/user-block/:id',verifyToken,verifyAdmin, async (req, res) => {
    const id = req.params.id
    const filter = { _id:new ObjectId(id) }
    const updateDoc = {
      $set: {
        status: 'blocked'
      }
    }
    const result = await userCollection.updateOne(filter, updateDoc)
    res.send(result)
  })

   // add new test api
   app.post('/addtest',verifyToken,verifyAdmin,async(req,res)=>{
    const newTest=req.body
    const result=await testCollection.insertOne(newTest)
    res.send(result)
  })

    // cancel a booking by (user) payment id
  app.delete('/test/:id',verifyToken, async (req, res) => {
    const id = req.params.id
    const query = { _id: new ObjectId(id)}
    const result = await testCollection.deleteOne(query)
    res.send(result)
  })

    // get single test by id also use in reswevation-test-admin-dashboard
  app.get('/test-allTest/:id',verifyToken,verifyAdmin, async (req, res) => {
    const id = req.params.id
    const query = { _id: new ObjectId(id)}
    const result = await testCollection.findOne(query)
    res.send(result)
  })

   // update test database
   app.patch('/updateTest',verifyToken,verifyAdmin,async (req, res) => {
    const test = req.body
    const query = { _id: new ObjectId(test.id) }
    const updateDoc = {
      $set: {
      
        name:test.name,
        image:test.image,
        shortDes:test.shortDes,
        longDes:test.longDes,
        price:test.price,
        slot:test.slot,
        date:test.date,
        month:test.month,
        year:test.year,
      }
    }
    const result = await testCollection.updateOne(query, updateDoc)

    res.send(result)
  })

    // add new banner api
   app.post('/addbanner',verifyToken,verifyAdmin,async(req,res)=>{
    const newBanner=req.body
    const result=await bannerCollection.insertOne(newBanner)
    res.send(result)
  })

    // get all banner api
  app.get('/banner',verifyToken,verifyAdmin, async (req, res) => {
    // console.log(req.headers);
    const result = await bannerCollection.find().toArray()
    res.send(result)
  })

  
    // delete a banner
  app.delete('/banner/:id',verifyToken,verifyAdmin, async (req, res) => {
    const id = req.params.id
    const query = { _id: new ObjectId(id) }
    const result = await bannerCollection.deleteOne(query)
    res.send(result)
  })

  // change Banner status active
  app.patch('/banner-active/:id',verifyToken,verifyAdmin, async (req, res) => {

    const banner=await bannerCollection.find().toArray()
    const updateD = {
      $set: {
        isActive: 'false'
      }
    }
    const resul = await bannerCollection.updateMany({}, updateD)


    const id = req.params.id
    const filter = { _id:new ObjectId(id) }
    const updateDoc = {
      $set: {
        isActive: 'true'
      }
    }
    const result = await bannerCollection.updateOne(filter, updateDoc)
    res.send(result)
  })

   // change Banner status block
   app.patch('/banner-block/:id',verifyToken,verifyAdmin, async (req, res) => {

    const id = req.params.id
    const filter = { _id:new ObjectId(id) }
    const updateDoc = {
      $set: {
        isActive: 'false'
      }
    }
    const result = await bannerCollection.updateOne(filter, updateDoc)
    res.send(result)
  })

    // get home banner api
  app.get('/banner-home', async (req, res) => {
    const query={isActive:'true'}
    const result = await bannerCollection.findOne(query)
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

      //get single user by email for status check in authprovider also in user Profile
      app.get('/user/:email',async(req,res)=>{
        const email=req.params.email
        const query={email:email}
        const result=await userCollection.findOne(query)
        res.send(result) 
      })


      // update user info in database
    app.patch('/up-user',verifyToken, async (req, res) => {
      const user = req.body
      const query = { email: user.email }
      const updateDoc = {
        $set: {
        
          name:user.name,
          district:user.district,
          upazila:user.upazila,
          bloodGroup:user.bloodGroup,
        }
      }
      const result = await userCollection.updateOne(query, updateDoc)

      res.send(result)
    })


    // upozila profile update api
    app.get('/upazila-user',verifyToken,async(req,res)=>{
      const result=await upazilaCollection.find().toArray()
      res.send(result)
    }) 

      // district profile update api
    app.get('/district-user',verifyToken,async(req,res)=>{
      const result=await districtCollection.find().toArray()
      res.send(result)
    })


// -----user api end-----

// ----------get  test api start----------

    //get all test api
app.get('/alltest',verifyToken,async(req,res)=>{
  const result = await testCollection.find().toArray()
  res.send(result)
})

    // get single test api by id
  
  app.get('/test-details/:id',verifyToken,async(req,res)=>{
    const id=req.params.id
    const query={_id:new ObjectId(id)}
    const result=await testCollection.findOne(query)
    res.send(result) 
  })


// ----------get all test api end----------

// ---------- slot api start----------

  //get slot by single test id
app.patch('/test-slot/:id',verifyToken,async(req,res)=>{
  const id=req.params.id
  const query={_id:new ObjectId(id)}
  const test=await testCollection.findOne(query)
  const newslot=test.slot-1
  
  const updateDoc = {
    $set: {
      slot: newslot
    }
  } 
  
  result = await testCollection.updateOne(query, updateDoc)
  
  
  // const result = await testCollection.updateOne(query, updateDoc)
  // const uptest=await testCollection.findOne(query)
  // const r=uptest.slot
  res.send(result)

})


  //get slot by single test id (when cancel)
  app.patch('/test-slot-cancel/:id',verifyToken,async(req,res)=>{
    const id=req.params.id
    const query={_id:new ObjectId(id)}
    const test=await testCollection.findOne(query)
    const newslot=test.slot+1
    
    const updateDoc = {
      $set: {
        slot: newslot
      }
    } 
    
    const result = await testCollection.updateOne(query, updateDoc)
    
    // console.log(newslot);
    // const result = await testCollection.updateOne(query, updateDoc)
    // const uptest=await testCollection.findOne(query)
    // const r=uptest.slot
    res.send(result)
  
  })


// ----------slot  api end----------


// --------stripe api--------

app.post("/create-payment-intent",verifyToken, async (req, res) => {
  const { price } = req.body;
  const amount=parseInt(price*100)

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount,
    currency: "usd",
    // In the latest version of the API, specifying the `automatic_payment_methods` parameter is optional because Stripe enables its functionality by default.
    payment_method_types: ['card']
  });

  res.send({
    clientSecret: paymentIntent.client_secret
  });

})

// ------payment related api--------

  //get all payments by condition
app.post('/payments',verifyToken,async(req,res)=>{
  const payment=req.body
  const paymentResult=await paymentCollection.insertOne(payment)
  res.send(paymentResult)
})


  //get all payment featured test
app.get('/featured-test',async(req,res)=>{
  const payTests=await paymentCollection.find().toArray()
  
  let testI=[]
  payTests.map(test=>testI.push(test.testId))

  const query={_id:{
    $in:testI.map(id=>new ObjectId(id))
  }}

  const result=await testCollection.find(query).toArray()

  // res.send(testI)
  res.send(result)
})

//get all booked test by user email also use in admin all user see info
app.get('/payment-test/:email',verifyToken,async(req,res)=>{

  const email=req.params.email
  const query={email:email}
  const result=await paymentCollection.find(query).toArray()
  res.send(result)
})

  //for user upcomming appoinment
app.get('/payment-test-up/:email',verifyToken,async(req,res)=>{

  const email=req.params.email
  const query={email:email,status:'Pending'}
  const result=await paymentCollection.find(query).toArray()
  res.send(result)
})

//search user email  use in admin allTest- reservetion search by email
app.get('/payment-test-search/:id/:email',verifyToken,verifyAdmin,async(req,res)=>{
  const id=req.params.id
  const email=req.params.email
  const query={testId:id,email:email}
  const result=await paymentCollection.find(query).toArray()
  res.send(result)
})

  // cancel a booking by (user) payment id --------- cancel korle slot baraite hobe------------------------
app.delete('/payment-trId/:id',verifyToken, async (req, res) => {
  const id = req.params.id
  const query = { transactionId: id}
  const result = await paymentCollection.deleteOne(query)
  res.send(result)
})


//search-test by date
app.get('/search-test/:date/:month/:year',verifyToken,async(req,res)=>{
  const date=req.params.date
  const month=req.params.month
  const year=req.params.year
  // console.log(typeof date);
  const query={date:parseInt(date ),month:parseInt(month),year:parseInt(year)}
  const result=await testCollection.find(query).toArray()
  res.send(result)
})

// get all reservation under a test api
app.get('/all-reservetion-for-a-test/:id',verifyToken,verifyAdmin, async (req, res) => {
  const id=req.params.id
  const query={testId:id}
  const result = await paymentCollection.find(query).toArray()
  res.send(result)
})

 // cancel a reservetion  paymentid ---------cancel korle slot barbe-----------------------------
 app.delete('/paymen-reservetion/:id',verifyToken,verifyAdmin, async (req, res) => {
  const id = req.params.id
  const query = { _id: new ObjectId(id)}
  const result = await paymentCollection.deleteOne(query)
  res.send(result)
})


  //Delivery report status api 
  app.patch('/delivery-report/:id/:trId/:email',verifyToken,verifyAdmin, async (req, res) => {
    const testId = req.params.id
    const trId = req.params.trId
    const email = req.params.email
    // console.log(testId,trId,email);
    const report=req.body
    const filter = { testId:testId,transactionId:trId,email:email }
    const updateDoc = {
      $set: {
        status: 'Delivered',
        report:report.report,
      }
    }
    const result = await paymentCollection.updateOne(filter, updateDoc)
    res.send(result)
  })


  //a user find delivery report 
app.get('/delivery-test-report/:email',verifyToken,async(req,res)=>{
  const email=req.params.email
  

  
  const status='Delivered'
  // console.log(typeof date);
  const query={email:email,status:status}
  const result=await paymentCollection.find(query).toArray()
  res.send(result)
})


  //chart for pending 
  app.get('/delivery-pending/',async(req,res)=>{
    
    const status='Pending'
    // console.log(typeof date);
    const query={status:status}
    const result=await paymentCollection.find(query).toArray()
    res.send(result)
  })

  //chart for delivered 
  app.get('/delivery-delivered/',async(req,res)=>{
    
    const status='Delivered'
    // console.log(typeof date);
    const query={status:status}
    const result=await paymentCollection.find(query).toArray()
    res.send(result)
  })







    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Diagnoz is running')
})

app.listen(port, () => {
  console.log(`Diagnoz is running from ${port} port`);
})