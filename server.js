const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const stream = require('stream');
const { google } = require('googleapis');




const app = express();


app.use(cors());

const bodyParser = require('body-parser');
//const { isAsyncFunction } = require('util/types');    nu e clar cei cu asta
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));



mongoose.connect(env("DATABASE_URL"));

const db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error:'));

db.once('open', () => {
  console.log('Database connected');
});








const apikeys = require('./blog-aplication-403920-0c51e0ccd3a9.json');///here is need modifications
const SCOPE = ["https://www.googleapis.com/auth/drive"];

async function authorize() {
  const jwtClient = new google.auth.JWT(
    apikeys.client_email,
    null,
    apikeys.private_key,
    SCOPE
  );

  await jwtClient.authorize();

  return jwtClient;
}

async function uploadFile(authClient, image) {
  return new Promise((resolve, reject) => {
    const drive = google.drive({ version: 'v3', auth: authClient, uploadType: 'multipart' });

    const fileMetaData = {
      name: image.originalname, // Use the original image name from the client
      parents: ["1YL8LvJf6oyyAe2G2ikB2DiX0wOk29cdQ"]
    }


    let bufferStream = new stream.PassThrough();
    bufferStream.end(image.buffer);
    const media = {
      mimeType: image.mimetype,
      body: bufferStream, // Use the image data from the client
    }

    drive.files.create({
      resource: fileMetaData,
      media: media,
      fields: 'id',
    }, (err, file) => {
      if (err) {
        console.error(err);
        return reject(err);
      }
      resolve(file);
    });
  });
}

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.use(upload.array('image'));








// const storage = multer.memoryStorage();
// const upload = multer({ storage: storage });

// app.use(upload.array('image'));

const ArticleSchema = new mongoose.Schema({
  Title: String,
  Content: String,
  ImageId: String,
  createdAt: { type: Date, default: Date.now }
});




const ArticleModel = mongoose.model('articles', ArticleSchema);

app.post('/api/upload-article', async (req, res) => {
  const { inputTitle, inputContent } = req.body;
  const image = req.files[0];





  console.log({ inputTitle, inputContent });      //*********** Delete at the end

  try {

    var FileUpload;

    try {
      const authClient = await authorize();
      FileUpload = await uploadFile(authClient, image);
      console.log(`File uploaded with ID: ${FileUpload.data.id}`);
    } catch (error) {
      console.error(`Error uploading file: ${error.message}`);
    }


    await ArticleModel.create({
      Title: inputTitle,
      Content: inputContent,
      ImageId: FileUpload.data.id,
      //ArticleType:String,
    });

    console.log(JSON.stringify('Article saved to database'));
    res.send(JSON.stringify('Article received and saved'));
  } catch (err) {
    console.error(err);
    res.status(500).send('Error saving article to database');
  }
});

app.get("/get-all-articles", async (req, res) => {
  try {
    const data = await ArticleModel.find({}).sort({ createdAt: -1 });
    res.send({ status: "ok", data: data });


  } catch (error) {
    console.error(error);
  }
});

app.delete('/api/delete-article', async (req, res) => {
  try {
    const articleId = req.body.articleId;
    console.log(articleId);
    // Use Mongoose to find and delete the article by its ID
    await ArticleModel.findByIdAndDelete(articleId);
    res.send(JSON.stringify('Article deleted'));
  } catch (error) {
    res.status(500).send(JSON.stringify('Error deleting the article'));
  }
});




app.listen(5001, () => {
  console.log('Server started on port 5000');
});
