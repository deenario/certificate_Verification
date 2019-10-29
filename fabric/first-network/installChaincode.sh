#!/bin/bash

#This command is used to close any previous instance of the blockchain that might be running.
. ./byfn.sh down

#This command is used to start the blockchain again with couchdb as database.
. ./byfn.sh up -s couchdb -an

# Command is used to install the chaincode certificate from the chaincode Directory on peer 0 org 1. Since it is a default peer
# so it will install on the default peer automatically. For any other you have to mention the peer path.
docker exec cli peer chaincode install -n certificate -l golang -p github.com/chaincode/certificate -v 1.0.2

# This command is used to install the chaincode on peer1 org 1.
docker exec -e "CORE_PEER_LOCALMSPID=Org1MSP" -e "CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.example.com/peers/peer1.org1.example.com/tls/ca.crt" -e "CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp" -e "CORE_PEER_ADDRESS=peer1.org1.example.com:8051" cli peer chaincode install -n election -p github.com/chaincode/certificate -v 1.0.2

# This command is used to install the chaincode on peer0 org 2.
docker exec -e "CORE_PEER_LOCALMSPID=Org2MSP" -e "CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt" -e "CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp" -e "CORE_PEER_ADDRESS=peer0.org2.example.com:9051" cli peer chaincode install -n election -p github.com/chaincode/certificate -v 1.0.2

# This command is used to install the chaincode on peer1 org 2.
docker exec -e "CORE_PEER_LOCALMSPID=Org2MSP" -e "CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.example.com/peers/peer1.org2.example.com/tls/ca.crt" -e "CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp" -e "CORE_PEER_ADDRESS=peer1.org2.example.com:10051" cli peer chaincode install -n election -p github.com/chaincode/certificate -v 1.0.2

# This Command is used to give a path to the ORDERER CA which is used to instantiate the chaincode.
export ORDERER_CA=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem

# This command is used to instantiate the chaincode. Instantiating the chaincode means to Start the chaincode after its installation.
docker exec cli peer chaincode instantiate -o orderer.example.com:7050 --cafile $ORDERER_CA -C mychannel -c '{"Args":[]}' -n certificate -v 1.0.2 -P "OR('Org1MSP.member', 'Org2MSP.member')"

sleep 3s

# We run this command so that we can store some data into the chaincode by passing all the parameters.
docker exec cli peer chaincode invoke -o orderer.example.com:7050 --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem -C mychannel -n certificate --peerAddresses peer0.org1.example.com:7051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt -c '{"Args":["addCertificate","01","GIK","Inshar","#$%#FFDVV$@DWCEFV%#$","2018-10-21T00:00:00Z"]}'

sleep 3s

# this is a command to call the Querycertificates smart contract to check if our insertion in the previous command actually stored some data in the blockchain or not.
docker exec cli peer chaincode invoke -o orderer.example.com:7050 --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem -C mychannel -n certificate --peerAddresses peer0.org1.example.com:7051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt -c '{"Args":["queryCertificate","#$%#FFDVV$@DWCEFV%#$"]}'