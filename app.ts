import dotenv from "dotenv-safe"
import express, { Request, Response } from "express"
import freeClimbSdk from "@freeclimb/sdk"
import bodyParser from "body-parser"
import { json } from "stream/consumers"


//loads environment variables into the node process
dotenv.config()
const  { ACCOUNT_ID, API_KEY, HOST_URL, PORT }  = process.env


const app = express()
app.use(bodyParser.urlencoded({extended:true}))
app.use(bodyParser.json())

interface SmsBody {
    from: string
    to: string 
    text: string

}
interface Instruction {
    script: string
    redirect: string
}
interface InstructionMap {
    [key: string]: Instruction

}

const freeClimbMod = freeClimbSdk(ACCOUNT_ID, API_KEY)

let mainMenuErrorCount = 0

app.post("/incomingSms", async (req: Request<any, any, SmsBody>, res: Response) => {
    console.log("DATA FROM FREECLIMB: ", req.body)
    const {from, to } = req.body
    await freeClimbMod.api.messages.create(to, from, "This is game store")
    res.sendStatus(200)
})
app.post("/incomingCall", async (req: Request, res: Response) => {
    
    const redirectUrl = `${HOST_URL}/mainMenuPrompt`
    const greeting = "Hello welcome to the gamestore."
    const welcomePercl = freeClimbMod.percl.build(
        freeClimbMod.percl.say(greeting),
         freeClimbMod.percl.pause(100),
        freeClimbMod.percl.redirect(redirectUrl)

    )    
    res.json(welcomePercl)

})

app.post("/mainMenuPrompt", async (req: Request, res: Response<freeClimbSdk.PerCL.Command[]>) => {
    const actionUrl = `${HOST_URL}/mainMenu`
    const getDigitsPercl = freeClimbMod.percl.getDigits(actionUrl, {
    prompts: [
        freeClimbMod.percl.say("please listen carefully as our menu options have changed"),
        freeClimbMod.percl.pause(100),
        freeClimbMod.percl.say("forexisting game orders press 1"),
        freeClimbMod.percl.say("for new game orders press 2"),
        freeClimbMod.percl.say("for hours and location press 3")

         ],
         maxDigits: 1,
         minDigits: 1,
         initialTimeoutMs: 12000,
         digitTimeoutMs: 6000
    })
res.json(freeClimbMod.percl.build(getDigitsPercl))

})

    
app.post("/mainMenu", async (req: Request<any, freeClimbSdk.PerCL.Command[], { digits: string}>,  res) => {
    const { digits } = req.body 
    const instructionMap: InstructionMap  = {
        "1": {
            script: "Redirecting your call to existing orders",
            redirect: `${HOST_URL}/endCall`
        },
        "2":{
            script: "Redirecting your call to new orders",
            redirect: `${HOST_URL}/endcall`
        },
        "3": {
            script: `We are open from Monda to friday from 8am to 5pm on saturdays we are open from 9am to 4pm and we closed on sundays`,
            redirect: `${HOST_URL}/endCall`
        }

     }
     const redirectUrl = `${HOST_URL}/mainMenuPrompt`
     const instructions = instructionMap[digits]
     // invalid input and less than error retry limit
     if ((!digits || !instructions) && mainMenuErrorCount < 3 ) {
         mainMenuErrorCount++
         res.json(
             freeClimbMod.percl.build(
                 freeClimbMod.percl.say("Error, please try again"),
                 freeClimbMod.percl.redirect(redirectUrl)
             )
         )
     } 
     // surpassed error retry limit
     else if (mainMenuErrorCount >= 3) {
         mainMenuErrorCount = 0
         res.json(
             freeClimbMod.percl.build(
                 freeClimbMod.percl.say("Maximum retry limit was reached"),
                 freeClimbMod.percl.redirect(`${HOST_URL}/endCall`)
             )
         )
     }
     // user provided good input
     else {
         mainMenuErrorCount = 0
         res.json(
             freeClimbMod.percl.build(
                 freeClimbMod.percl.say(instructions.script),
                 freeClimbMod.percl.redirect(instructions.redirect)
             )
         )
     }
}) 
app.post("/transfer", (req: Request, res: Response) => {
    res.json(
        freeClimbMod.percl.build(
            freeClimbMod.percl.say("Please wait whiole we transfer uou to an operator"),
            freeClimbMod.percl.redirect(`${HOST_URL}/endCall`)
        )
    )


})

app.post("/endcall", (req: Request, res: Response) => {
res.json(
    freeClimbMod.percl.build(
        freeClimbMod.percl.say("Thank you for calling Armani gaming store, have a nice day"),
        freeClimbMod.percl.hangup()
    )
)
})



app.listen(PORT, () => {
    console.log(`Succesfully started server on ${PORT}`)
})
