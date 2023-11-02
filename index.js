const express = require('express');
const cors = require('cors');
// const jwt = require('jsonwebtoken');
const jwt = require('jsonwebtoken');

const cookieParser = require('cookie-parser');
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;


// middleware
// app.use(cors()); // you need to do this for send clint site cookie
app.use(cors({
  origin: ['http://localhost:5173'],
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());




// const uri = "mongodb+srv://<username>:<password>@cluster0.fikwith.mongodb.net/?retryWrites=true&w=majority";

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.fikwith.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// middlewares
const logger = async(req, res, next) =>{
   console.log('called:', req.host, req.originalUrl)
   next();
}


const verifyToken = async(req, res, next)=>{
  const token = req.cookies?.token;
  console.log('Value of token in middleware:', token);

  if(!token){
    return res.status(401).send({message: 'unauthorized access'})
  }
  // verify token
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET , (error, decoded)=>{
    // error
    if(error){
      console.log(error.message)
      return res.status(401).send({message: 'unAuthorized access'})
    }
    // decoded or valid  
    console.log('Value in the token', decoded);
    req.user = decoded;
    next();
  } )


  // next()
}


async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const serviceCollection = client.db('carDoctor').collection('services');

    const bookingCollection = client.db('carDoctor').collection('bookings');

    // Auth related Api
    app.post('/jwt', logger, async(req, res)=>{
      const user = req.body;
      console.log(user);
      // const token = jwt.sign(user, 'secret', {expiresIn: '1h' } )
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '1h' } )
     
      // res.send(token)
      res
      .cookie('token', token, {
        httpOnly: true,
        secure:false,
        // sameSite: 'none'
      })
      .send({success:true})
    })


    // Services related api
    // makes all service api
    app.get('/services',  logger, async(req, res)=>{
      const cursor = serviceCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })


    // make a special service api
    app.get('/services/:id', async(req, res)=>{
      const id = req.params.id;

      const options = {
        projection: { title: 1, price: 1, service_id: 1, img: 1 },
      };

      const query = {_id : new ObjectId(id)};
      const result = await serviceCollection.findOne(query, options);
      res.send(result)
    })



    // booking related Api

    // read all and special data api
    app.get('/bookings', logger, verifyToken, async(req, res)=>{
      console.log(req.query.email);
      // console.log('tok tok token', req.cookies.token )
      console.log('user in the valid token:',req.user);

      if(req.query.email !== req.user.email){
        return res.status(403).send({message: 'forbidden'})
      }

      let query ={};

      if(req.query?.email){
        query= {email: req.query.email}
      }
      const result = await bookingCollection.find(query).toArray();
      res.send(result)
    })

    // insert a booking Api for mongodb
    app.post('/bookings',   async(req, res)=>{
        const booking = req.body;
        console.log(booking);
        const result = await bookingCollection.insertOne(booking);
        res.send(result);
    })


    


    // update data
    app.patch('/bookings/:id', async(req, res)=>{
      const id = req.params.id;
      const filter = {_id : new ObjectId(id)};
      const updatedBookings = req.body;
      console.log(updatedBookings);
      const updateDoc = {
        $set: {
          status: updatedBookings.status
        },
      };

      const result = await bookingCollection.updateOne(filter, updateDoc);
      res.send(result);

    })



    // Delete Api
    app.delete('/bookings/:id', async(req, res)=>{
        const id = req.params.id;

        const query = {_id : new ObjectId(id)};

        const result = await bookingCollection.deleteOne(query);
        res.send(result)

    })




    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res)=>{
    res.send('Doctor is running')
});

app.listen(port, ()=>{
    console.log(`car doctor is running on port ${port}`)
})