# salesforce-env-tests

Build automated tests to validate Salesforce environment

Execute below commands to generate automated config tests for your objects.

```
<!-- generate config tests and run comparison-->

docker build -t sfconfigtests .

docker run -v "`pwd`/execution-report":/mnt/execution-report -it sfconfigtests
```
