//Importing required libraries and user-defined modules
const readline = require("readline");
const controller = require('./Controller');


//Creating interface for reading user input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

//Greeting
console.info('------------------------------------------------');
console.info('Welcome to iConnect Inventory Management Systems');
console.info('------------------------------------------------');
console.info('Input data in below mentioned format');
console.info('<Country>:<Passport Number (Optional)>:<Item>:<Quantity>:<Item>:<Quantity>\n');

//Accept user-input
rl.question("> ", (userInput) => {
    let status = controller.processUserInput(userInput);
    if (status) {
        rl.close();
    }
});

//Stop listening for user-input
rl.on("close", function () {
    console.info('\n------------------------------------------------');
    console.log("Thank you for purchasing. Visit Again!");
    console.info('------------------------------------------------');
    process.exit(0);
});
