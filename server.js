const mongoose = require("mongoose");
const Document = require("./Document");
require("dotenv").config();

// connection to the database
const mongodb_url = process.env.MONGO_URL;
mongoose.connect(mongodb_url, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
  useCreateIndex: true,
});

// connect to the client url
const io = require("socket.io")(process.env.PORT || 3001, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

// default data, when new document is created
const defaultValue = "";

// connect to the client
io.on("connection", (socket) => {
  // fetch document from the DB or create a new
  socket.on("get-document", async (documentId) => {
    const document = await findOrCreateDocument(documentId);

    // make a room for all client with same documentId
    socket.join(documentId);
    socket.emit("load-document", document.data);

    // send changes to all other members other than ourself
    socket.on("send-changes", (delta) => {
      socket.broadcast.to(documentId).emit("receive-changes", delta);
    });

    // save document changes
    socket.on("save-document", async (data) => {
      await Document.findByIdAndUpdate(documentId, { data });
    });
  });
});

// fetch document from the DB or create a new
async function findOrCreateDocument(id) {
  if (id == null) return;

  const document = await Document.findById(id);
  if (document) return document;
  return await Document.create({ _id: id, data: defaultValue });
}
