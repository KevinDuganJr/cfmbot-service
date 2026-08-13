import db from "./db/firebase"

async function count() {
  const docs = await db.collection("madden_data27").listDocuments()
  console.log(docs.length)
}

count()
