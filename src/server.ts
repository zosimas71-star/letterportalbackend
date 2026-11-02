import express,{request,response} from "express"
const app=express();
const port:Number=Number(process.env.PORT) || 4000

app.use(express.json());
app.get("/", (_req, res) => {
  res.status(200).json({
    message: "Welcome to my TypeScript Backend!",
  });
});

app.listen(port,()=>{
    console.log("display result w...")


})