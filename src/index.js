const express = require('express');
const app = express();

require('dotenv').config();
const PORT = process.env.PORT

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const ApiRoutes = require('./routes/index');
app.use('/api', ApiRoutes);


app.listen(PORT , () => {
    console.log(`server started at PORT ${PORT}`);
})