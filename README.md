# salesforce-env-tests

Build automated tests to validate Salesforce environment

## Setup Base and Destination Orgs

- Open inscope-object-list.json and update Base Salesforce Org name and list of Destination Org against which comparison has to be done.

* Set the alias name for your base and destination orgs
* Ensure to have corresponding config file for the org alias in config directory.

## Set Objects for your Base and Destination Orgs

## Config Setup

Config file name must be config.{org's alias}.json

- In current example, base Org is "test" hence config.test.json is kept under config folder.
- Add valid username, password and security_token

Execute below commands to generate automated config tests for your objects.

```
<!-- generate config tests and run comparison-->

docker build -t sfconfigtests .

docker run -v "`pwd`/execution-report":/mnt/execution-report -it sfconfigtests
```
