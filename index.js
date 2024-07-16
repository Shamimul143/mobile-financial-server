const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken')
require('dotenv').config();
// const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)
const port = process.env.PORT || 5000;





// middleware
app.use(cors({
    // origin: ['https://adopt-a-pet-haven-b9a12.netlify.app']
    origin: ['http://localhost:5173', 'http://192.168.204.100:5173']
}));
app.use(express.json());




const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.tgeue7q.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
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

        const UserCollection = client.db("mobileFinancialService").collection("users");
        // const adoptCollection = client.db("adoptPetDb").collection("pets");
        // const donationCollection = client.db("adoptPetDb").collection("donation");
        // const adoptionCollection = client.db("adoptPetDb").collection("adoption");
        // const paymentCollection = client.db("adoptPetDb").collection("payment");


        // jwt related api

        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
                expiresIn: '1h'
            });
            res.send({ token })
        })


        // middlewares
        const verifytoken = (req, res, next) => {
            console.log(req.headers.authorization);
            if (!req.headers.authorization) {
                return res.status(401).send({ message: 'unauthorized access' })
            }
            const token = req.headers.authorization.split(' ')[1];

            jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: 'unauthorized access' })
                }
                req.decoded = decoded;
                next()
            })
        }

        // use verify admin after varifyToken
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email };
            const user = await UserCollection.findOne(query);
            const isAdmin = user?.role === 'admin';
            if (!isAdmin) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            next()
        }



        // users collection api
        app.get('/users', verifytoken, verifyAdmin, async (req, res) => {
            console.log((req.headers));
            const result = await UserCollection.find().toArray();
            res.send(result);
        })

        // admin api
        app.get('/users/admin/:email', verifytoken, async (req, res) => {
            const email = req.params.email;
            if (email !== req.decoded.email) {
                return res.status(403).send({ message: 'forbidded access' })
            }
            const query = { email: email };
            const user = await UserCollection.findOne(query);
            let admin = false;
            if (user) {
                admin = user?.role === 'admin';
            }
            res.send({ admin })
        })


        app.post('/users', async (req, res) => {
            const user = req.body;
            // insert email if user doesnt exists
            // you can do this many ways (1. email unique, 2. upsert, 3. simple checking)

            const query = { email: user.email }
            const existingUser = await UserCollection.findOne(query);
            if (existingUser) {
                return res.send({ message: 'user already exists', insertedId: null })
            }

            const result = await UserCollection.insertOne(user);
            res.send(result);
        })

        app.delete('/users/:id', verifytoken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await UserCollection.deleteOne(query);
            res.send(result);
        })

        app.patch('/users/admin/:id', verifytoken, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await UserCollection.updateOne(filter, updatedDoc);
            res.send(result);
        })

        // pet releted api
        app.get('/pets', async (req, res) => {

            const filter = req.query;

            console.log('filter', filter);
            let query = {}
            if (filter.search) {
                query = {
                    petName: { $regex: filter.search, $options: "i" }
                };
            }
            // const query = {
            //     petCategory: {$regex:filter.search.toString(),$options:"i" }
            // };

            const options = {
                sort: {
                    adoptDateTime: filter.sort === 'asc' ? 1 : -1
                }
            };

            const result = await adoptCollection.find(query, options).toArray();
            res.send(result);
        })
        // .............................................................
        app.get('/pets/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await adoptCollection.findOne(query);
            res.send(result);
        })
        // app.get('/menu/:id', async (req, res) => {
        //   const id = req.params.id;
        //   const query = { _id: (id) }
        //   const result = await menuCollection.findOne(query);
        //   res.send(result);
        // })
        // .....................................................................

        app.post('/pets', verifytoken, async (req, res) => {
            const item = req.body;
            const result = await adoptCollection.insertOne(item);
            res.send(result);
        })

        app.patch('/pets/:id', async (req, res) => {
            const item = req.body;
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updatedDoc = {
                $set: {
                    petImage: item.petImage,
                    petName: item.petName,
                    petAge: item.petAge,
                    petCategory: item.petCategory,
                    petLocation: item.petLocation,
                    adoptDateTime: item.adoptDateTime,
                    adopted: item.adopted,
                    shortDescription: item.shortDescription,
                    longDescription: item.longDescription
                }
            }
            const result = await adoptCollection.updateOne(filter, updatedDoc);
            res.send(result);
        })

        app.delete('/pets/:id', verifytoken, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await adoptCollection.deleteOne(query);
            res.send(result)
        })





        app.get('/useMyAddedPet/:email', async (req, res) => {
            // console.log(req.params.email);
            // console.log(req.cookies.token);
            // if (req.query.email !== req.user.email) {
            //     return res.status(403).send({ message: 'forbidden access' })
            // }

            const result = await adoptCollection.find({ email: req.params.email }).toArray();
            res.send(result)
        })

        // donation section

        app.get('/donation', async (req, res) => {
            const result = await donationCollection.find().toArray();
            res.send(result);
        })



        app.get('/donations/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await donationCollection.findOne(query);
            res.send(result);
        })



        app.get('/donation/:email', async (req, res) => {
            //   const email = req.query.email;
            //   const query = { email: email }
            const result = await donationCollection.find({ email: req.params.email }).toArray();
            res.send(result);
        })



        app.post('/donation', async (req, res) => {
            const donationItem = req.body;
            const result = await donationCollection.insertOne(donationItem);
            res.send(result)
        })



        app.patch('/donation/:id', async (req, res) => {
            const item = req.body;
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updatedDoc = {
                $set: {
                    image: item.image,
                    petName: item.name,
                    amount: item.amount,
                    lastDateOfDonation: item.lastDateOfDonation,
                    storeDate: item.storeDate,
                    shortDescription: item.shortDescription,
                    longDescription: item.longDescription
                }
            }
            const result = await donationCollection.updateOne(filter, updatedDoc);
            res.send(result);
        })




        app.delete('/donation/:id', verifytoken, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await donationCollection.deleteOne(query);
            res.send(result)
        })

        // adoption api
        app.get('/adoption/:email', async (req, res) => {
            //   const email = req.query.email;
            //   const query = { email: email }
            const result = await adoptionCollection.find({ email: req.params.email }).toArray();
            res.send(result);
        })

        app.post('/adoption', async (req, res) => {
            const adoptionItem = req.body;
            const result = await adoptionCollection.insertOne(adoptionItem);
            res.send(result)
        })


        // ------------------------------------------------------
        app.patch('/adoptions/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            console.log(id);
            const assetsReqData = req.body;
            // const options = {upsert:true};


            const updateDoc = {
                $set: {
                    status: assetsReqData.status
                }
            }

            const result = await adoptionCollection.updateOne(query, updateDoc);
            res.send(result);
        })

        // ------------------------------------------------




        // payment

        app.post("/create-payment-intent", async (req, res) => {
            const { price } = req.body;
            console.log(price);
            const amount = parseInt(price) * 100;
            console.log('donation', amount);
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            })
            res.send({
                clientSecret: paymentIntent.client_secret
            })
        })
        app.get('/payment/:email', async (req, res) => {
            //   const email = req.query.email;
            //   const query = { email: email }
            const result = await paymentCollection.find({ email: req.params.email }).toArray();
            res.send(result);
        })

        app.post('/payment', async (req, res) => {
            const payment = req.body;
            const paymentResult = await paymentCollection.insertOne(payment);
            res.send(paymentResult)
        })


        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        // console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('pet is going')
})

app.listen(port, () => {
    console.log(`pet adopt cannect successly ${port}`);
})