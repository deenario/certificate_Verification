package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"time"

	//"strings"

	"github.com/hyperledger/fabric/core/chaincode/shim"
	"github.com/hyperledger/fabric/protos/peer"
)

//SmartContract is the data structure which represents this contract and on which  various contract lifecycle functions are attached
type SmartContract struct {
}

// Certificate struct defined for the Data we will be inputting into the ledger. You can understand this struct as
// a Table in a mysql Database. The Struct in blockchain is similar to a table in mysql.
type Certificate struct {
	ObjectType      string    `json:"Type"`
	ID              string    `json:"id"`
	UniversityName  string    `json:"universityName"`
	StudentName     string    `json:"studentName"`
	CertificateHash string    `json:"certificateHash"`
	CreatedAt       time.Time `json:"createdAt"`
}

// Init method that is run as soon as the chaincode is installed on the blockchain.
// usually people add some preentered data into the init method but in our example we want our struct to be empty so its not doing anything.
func (t *SmartContract) Init(stub shim.ChaincodeStubInterface) peer.Response {
	fmt.Println("Init Firing!")
	return shim.Success(nil)
}

// Invoke Method is called to invoke a smart contract in the blockchain.
func (t *SmartContract) Invoke(stub shim.ChaincodeStubInterface) peer.Response {
	// Retrieve the requested Smart Contract function and arguments
	function, args := stub.GetFunctionAndParameters()
	fmt.Println("Chaincode Invoke Is Running " + function)

	if function == "addCertificate" {
		return t.addCertificate(stub, args)
	}
	if function == "queryCertificate" {
		return t.queryCertificate(stub, args)
	}

	fmt.Println("Invoke did not find specified function " + function)
	return shim.Error("Invoke did not find specified function " + function)
}

// This is out smart contract to add a certificate for the student.
func (t *SmartContract) addCertificate(stub shim.ChaincodeStubInterface, args []string) peer.Response {

	var err error
	if len(args) != 5 {
		return shim.Error("Incorrect Number of Arguments. Expecting 5")
	}

	id := args[0]
	universityName := args[1]
	studentName := args[2]
	certificateHash := args[3]
	createdAt, err1 := time.Parse(time.RFC3339, args[4])
	if err1 != nil {
		return shim.Error(err.Error())
	}

	// ======Check if id Already exists
	dataAsBytes, err := stub.GetState(id)
	if err != nil {
		return shim.Error("Transaction Failed with Error: " + err.Error())
	} else if dataAsBytes != nil {
		return shim.Error("The Inserted ID already Exists: " + id)
	}

	// ===== Create Object and Marshal to JSON
	objectType := "certificate"
	data := &Certificate{objectType, id, universityName, studentName, certificateHash, createdAt}
	dataJSONasBytes, err := json.Marshal(data)

	if err != nil {
		return shim.Error(err.Error())
	}

	// ======= Save to State
	err = stub.PutState(id, dataJSONasBytes)
	if err != nil {
		return shim.Error(err.Error())
	}

	// ======= Return Success
	fmt.Println("Successfully Saved Data")
	return shim.Success(nil)
}

// This is a smart contract to query the Ledger.
func (t *SmartContract) queryCertificate(APIstub shim.ChaincodeStubInterface, args []string) peer.Response {

	if len(args) < 1 {
		return shim.Error("Incorrect number of arguments. Expecting 1")
	}

	certificateHash := args[0]
	queryString := fmt.Sprintf("{\"selector\":{\"Type\":\"certificate\",\"certificateHash\":\"%s\"}}", certificateHash)

	queryResults, err := getQueryResultForQueryString(APIstub, queryString)
	if err != nil {
		return shim.Error(err.Error())
	}
	return shim.Success(queryResults)
}

// =========================================================================================
// getQueryResultForQueryString executes the passed in query string.
// Result set is built and returned as a byte array containing the JSON results.
// =========================================================================================
func getQueryResultForQueryString(stub shim.ChaincodeStubInterface, queryString string) ([]byte, error) {

	fmt.Printf("- getQueryResultForQueryString queryString:\n%s\n", queryString)

	resultsIterator, err := stub.GetQueryResult(queryString)
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	// buffer is a JSON array containing QueryRecords
	var buffer bytes.Buffer
	buffer.WriteString("[")

	bArrayMemberAlreadyWritten := false
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}
		// Add a comma before array members, suppress it for the first array member
		if bArrayMemberAlreadyWritten == true {
			buffer.WriteString(",")
		}
		buffer.WriteString("{\"Key\":")
		buffer.WriteString("\"")
		buffer.WriteString(queryResponse.Key)
		buffer.WriteString("\"")

		buffer.WriteString(", \"Record\":")
		// Record is a JSON object, so we write as-is
		buffer.WriteString(string(queryResponse.Value))
		buffer.WriteString("}")
		bArrayMemberAlreadyWritten = true
	}
	buffer.WriteString("]")

	fmt.Printf("- getQueryResultForQueryString queryResult:\n%s\n", buffer.String())

	return buffer.Bytes(), nil
}

//Main Function starts up the Chaincode
func main() {
	err := shim.Start(new(SmartContract))
	if err != nil {
		fmt.Printf("Smart Contract could not be run. Error Occured: %s", err)
	} else {
		fmt.Println("Smart Contract successfully Initiated")
	}
}
