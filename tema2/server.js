let http = require('http');
let fs = require('fs');
let PORT = 8080;
let cars = "";
let configuration = {
    "homepagePath": "/cars",
    "jsonFilePath": "cars.json",
    "jsonFileEncoding": "utf-8",
};


console.log("Server listening to localhost:" + PORT + " ...");
http.createServer(function (req, res) {
    if (req.url.substring(0, 5) === configuration.homepagePath) {
        fs.readFile(configuration.jsonFilePath, configuration.jsonFileEncoding, function (err, data) {
            if (err) throw err;
            cars = JSON.parse(data);
            switch (req.method) {
                case "GET":
                    getMethodHandler(req, res);
                    break;
                case "POST":
                    postMethodHandler(req, res);
                    break;
                case "PUT":
                    putMethodHandler(req, res);
                    break;
                case "DELETE":
                    deleteMethodHandler(req, res);
                    break;
                default:
                    errorHandler(res, 404, "Unknown method!");
                    break;
            }
        });
    }
    else
        errorHandler(res, 404, "Unknown path!");
}).listen(PORT);

function getMethodHandler(req, res) {
    if (req.url === configuration.homepagePath) {
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.write(JSON.stringify(cars, null, 2));
        res.end();
    }
    else if (req.url.match(configuration.homepagePath + "/id=\\d+$")) {
        res.writeHead(200, {'Content-Type': 'text/html'});
        let index = req.url.indexOf('id=') + 3;
        let id = req.url.substring(index);
        if(cars.hasOwnProperty(id)) {
            res.write(JSON.stringify(cars[id]), null, 1);
            res.end();
        }
        else
            errorHandler(res,404, "[GET] No such element found in the database!");
    }
    else
        errorHandler(res, 404, "[GET] No such element found in the database!");
}

function postMethodHandler(req, res) {
    if (req.url === configuration.homepagePath) {
        res.writeHead(201, {'Content-Type': 'text/html'});
        if (checkCarInformation(req.headers)) {
            let car = generateNewCar(req.headers);
            let carId = Object.keys(car)[0];
            res.writeHead(201, {'Content-Type': 'text/html'});
            res.write("[POST] A new car has been created with the id = " + carId);
            cars[carId] = car[carId];
            updateJsonFile(cars);
            res.end();
        }
        else
            errorHandler(res, 400, "[POST] The request header should also contain 4 fields:" +
                " name, brand, price and power!")
    }
    else
        errorHandler(res, 404, "[POST] Unknown request at this url!" +
            " You can only create a new record at /cars but can't choose the id!");
}

function putMethodHandler(req, res) {
    if (req.url === configuration.homepagePath)
        errorHandler(res, 400, "[PUT] You need to specify the id of the car you want to update!");
    else
        if (req.url.match(configuration.homepagePath + "/id=\\d+$")) {
            let index = req.url.indexOf('id=') + 3;
            let id = req.url.substring(index);
            if (cars.hasOwnProperty(id)) {
                res.writeHead(201, {'Content-Type': 'text/html'});
                cars[id] = updateCar(cars[id], req.headers);
                res.write(JSON.stringify(cars[id]), null, 1);
                updateJsonFile(cars);
                res.end();
            }
            else
                errorHandler(req, 404, "[PUT] No record found with that id!");
        }
        else
            errorHandler(res, 404, "[PUT] No element found!");
}

function deleteMethodHandler(req, res) {
    if (req.url === configuration.homepagePath)
        errorHandler(res, 403, "[DELETE] You aren't allowed to delete all cars!");
    else
        if (req.url.match(configuration.homepagePath + "/id=\\d+$")) {
            let index = req.url.indexOf('id=') + 3;
            let id = req.url.substring(index);
            if (cars.hasOwnProperty(id)) {
                delete cars[id];
                res.writeHead(200, {'Content-Type': 'text/html'});
                res.write("[DELETE] The car with the provided ID has been deleted from the database!\n");
                updateJsonFile(cars);
                res.end();
        }
        else
            errorHandler(res, 404, "[DELETE] No such element found in the database!");
    }
    else
        errorHandler(res, 404, "[DELETE] No such element found in the database!");
}

function errorHandler(res, statusCode, message) {
    res.writeHead(statusCode, {'Content-Type': 'text/html'});
    res.write(message);
    res.end();
}

function checkCarInformation(information) {
    return information.hasOwnProperty("name") && information.hasOwnProperty("brand")
        && information.hasOwnProperty("price") && information.hasOwnProperty("power")
}

function generateNewCar(information) {
    let newID = (Math.floor(Math.random() * 100) + 10).toString();
    while(cars.hasOwnProperty(newID))
        newID = (Math.floor(Math.random() * 100) + 10).toString();
    let car = {
        "id":
            {
                'name': information['name'],
                "brand": information['brand'],
                "price": information['price'],
                "power": information['power']
            }
    };
    car[newID] = car["id"];
    delete car["id"];
    return car
}

function updateCar(car, information){
    let fields = ["name","brand","price","power"];
    fields.forEach(function(field) {
        if(information.hasOwnProperty(field))
            car[field] = information[field];
    });
    return car;
}

function updateJsonFile(cars){
    fs.writeFileSync(configuration.jsonFilePath, JSON.stringify(cars, null, 2) , configuration.jsonFileEncoding);
}