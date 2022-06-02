![ddt_graphic1x](https://user-images.githubusercontent.com/101042972/171440725-b9e7bad8-11d8-4202-965a-96d1f5d9b2b1.jpg)


<p>
  <a href="https://www.serverless.com">
    <img src="http://public.serverless.com/badges/v3.svg">
  </a>
</p>

Dynamo Data Transform is an easy to use data transformation tool for DynamoDB.

It allows performing powerful data transformations using simple Javascript commands, without the risk of breaking your database.
Available as a [Serverless plugin](#serverless-plugin), [npm package](#standalone-npm-package) and even as an [interactive CLI](#interactive-cli), Dynamo Data Transform saves you time and keeps you safe with features like dry-running a data transformation and even rolling back your last trasnformation if needed.

![cli-image](https://user-images.githubusercontent.com/101042972/171456161-fe2437b7-06be-4106-a0e0-acbf7d442a60.JPG)

**Features**

- Seemless data transformations management.
- Support for multiple stages.
- History of executed data transformations.
- Dry run option for each command (by suppling --dry flag, the data will be printed instead of stored).
- Safe & Secure preparation data
- Store preparation data in a private s3 bucket. [Prepare data for your data transformation](#usage-and-command-line-options)

## Quick Start
### Serverless plugin
- Install
```bash
npm install dynamo-data-transform --save-dev
```
- Add the tool to your serverless.yml
```YML
plugins:
  - dynamo-data-transform
```
- Run
```bash
sls dynamodt list
```

### Standalone npm package
- Install the tool
```bash
npm install -g dynamo-data-transform
```
- Run the tool
```bash
dynamodt --help
```
Or with the shortcut
```bash
ddt --help
```
### Interactive CLI
After installing the npm package, run:
```bash
dynamodt -i
```








## Table of contents

- [Quick Start](#quick-start)
- [Usage and command-line options](#usage-and-command-line-options)
- [What happens behind the scenes](#what-happens-behind-the-scenes)
- [The data transformation process](#the-data-transformation-process)
  - [Process Steps](#steps)
  - [Key Concepts](#key-concepts)
  - [Troubleshooting](#troubleshooting)
  - [Examples](#examples)



## Usage and command-line options

List available commands:
Serverless plugin:
```bash
sls dynamodt --help
```
Standalone npm package:
```bash
dynamodt list
```


To list all of the options for a specific command run:
Serverless plugin:
```bash
sls dynamotdt <command> --help
```

## What happens behind the scenes
- When a data transformation runs for the first time, a record in your table is created. This record is for tracking the executed transformations on a specific table.


## The safe data transformation process
The next section describes how the data transformation process looks like, and the order of each step.
### Steps
#### 1st Phase (Add New Resources)
1. Update the serverless.yml resources (if needed) \
   Reminder: we are not overriding existing data but creating new. [See some examples](#examples)
1. Your new code should be able to write to your old and new resources which ensures that we can roll back to the previous state and prevent possible data gaps.
1. Create a pull request and deploy it to every stage in your application

#### 2nd Phase (data transformation)

1. For the first time use `sls dynamodt init` it will generate a folder per table inside the root folder of your service (The name of the folder is the exact name of the table).
A template data transformation file (v1.js) will be created in each table folder. \
Implement these functions:
    1. `transformUp` - transform all of the table items to the new shape (use preparationData if needed).
    1. `transformDown` - transform all of the table items to the previous shape.
    1. `prepare` - use this function whenever your data transformation relies on data from external resources.

1. Export these functions and export the version of the current data transformation (set the sequence variable value. It should be the same number of the file name).

1. Preparing data from external resources for the data transformation can be done by using `sls dynamodt prepare`

    Run `sls dynamodt prepare --tNumber <transformation_number> --table <table>`\
    The data will be stored in a S3 bucket  \
    The data will be decrypted while running the data transformation script.

1. **Final Step** Create a pull request. \
   Note that the data transformation runs after an sls deploy command it is integrated \
   with lifecycle of serverless `after:deploy:deploy` hook.

#### 3rd Phase (Use The New Resources/Data)
1. Adjust your code to work with the new data. \
   For example, read from the new index instead of the old one.
1. Create a pull request with the updated lambdas.


#### 4th Phase (Cleanup)
1. Clean the unused data (attributes/indexes/etc). 


### Key Concepts 
First of all, keep in mind that our mission is to prevent downtime while executing data transformations.
- Don't override resources/data
- Your code should be able to work with the old version of the data and keep it updated.
- To be continued...



### Data Transformation Script Format (e.g v1_script.js)
```js
const { utils } = require('dynamo-data-transform')

const TABLE_NAME = 'UsersExample'

const transformUp = async ({ ddb, isDryRun, preparationData }) => {
  // your code here... 
  // return { transformed: 50 } // return the number of transformed items
}

const transformDown = async ({ ddb, isDryRun, preparationData }) => {
  // your code here...
  // return { transformed: 50 } // return the number of transformed items
}

const prepare = async ({ ddb, isDryRun }) => {
  // your code here...
  // return { transformed: 50 } // return the number of transformed items
}

module.exports = {
  transformUp,
  transformDown,
  prepare, // optional
  transformationNumber: 1,
}
```


### Examples
Examples of data transformation code:
https://github.com/jitsecurity/dynamo-data-transform/tree/main/examples/serverless-localstack/data-transformations


#### Insert records

```js
// Seed users data transformation
const { utils } = require('dynamo-data-transform');
const { USERS_DATA } = require('../../usersData');

const TABLE_NAME = 'UsersExample';

/**
 * @param {DynamoDBDocumentClient} ddb - dynamo db document client https://github.com/aws/aws-sdk-js-v3/tree/main/clients/client-dynamodb
 * @param {boolean} isDryRun - true if this is a dry run
 */
const transformUp = async ({ ddb, isDryRun }) => {
  return utils.insertItems(ddb, TABLE_NAME, USERS_DATA, isDryRun);
};

const transformDown = async ({ ddb, isDryRun }) => {
  return utils.deleteItems(ddb, TABLE_NAME, USERS_DATA, isDryRun);
};

module.exports = {
  transformUp,
  transformDown,
  transformationNumber: 1,
};
```

#### Add a new field to each record
```js
// Adding a "randomNumber" field to each item
const { utils } = require('dynamo-data-transform');

const TABLE_NAME = 'UsersExample';

const transformUp = async ({ ddb, isDryRun }) => {
  const addRandomNumberField = (item) => {
    const updatedItem = { ...item, randomNumber: Math.random() };
    return updatedItem;
  };
  return utils.transformItems(ddb, TABLE_NAME, addRandomNumberField, isDryRun);
};

const transformDown = async ({ ddb, isDryRun }) => {
  const removeRandomNumberField = (item) => {
    const { randomNumber, ...oldItem } = item;
    return oldItem;
  };
  return utils.transformItems(ddb, TABLE_NAME, removeRandomNumberField, isDryRun);
};

module.exports = {
  transformUp,
  transformDown,
  // prepare, // pass this function only if you need preparation data for the transformation
  transformationNumber: 2,
};
```

#### Add field using preparation data (s3 bucket)
```js
// Adding a new field "hasWikiPage"
// "hasWikiPage" is a boolean field that is set to true if the item has a wiki page
// It is calculated with a prepare function that fetches the wiki page status for each item

const { utils } = require('dynamo-data-transform');

const userAgentHeader = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.138 Safari/537.36',
};

const fetch = (...args) => import('node-fetch').then(({ default: nodeFetch }) => nodeFetch(
  ...args,
  {
    headers: userAgentHeader,
  },
));

const TABLE_NAME = 'UsersExample';

const transformUp = async ({ ddb, preparationData, isDryRun }) => {
  const addHasWikiPage = (hasWikiDict) => (item) => {
    const valueFromPreparation = hasWikiDict[`${item.PK}-${item.SK}`];
    const updatedItem = valueFromPreparation ? {
      ...item,
      hasWikiPage: valueFromPreparation,
    } : item;
    return updatedItem;
  };

  return utils.transformItems(
    ddb,
    TABLE_NAME,
    addHasWikiPage(JSON.parse(preparationData)),
    isDryRun,
  );
};

const transformDown = async ({ ddb, isDryRun }) => {
  const removeHasWikiPage = (item) => {
    const { hasWikiPage, ...oldItem } = item;
    return oldItem;
  };

  return utils.transformItems(ddb, TABLE_NAME, removeHasWikiPage, isDryRun);
};

const prepare = async ({ ddb }) => {
  let lastEvalKey;
  let preparationData = {};

  let scannedAllItems = false;

  while (!scannedAllItems) {
    const { Items, LastEvaluatedKey } = await utils.getItems(ddb, lastEvalKey, TABLE_NAME);
    lastEvalKey = LastEvaluatedKey;

    const currentPreparationData = await Promise.all(Items.map(async (item) => {
      const wikiItemUrl = `https://en.wikipedia.org/wiki/${item.name}`;
      const currWikiResponse = await fetch(wikiItemUrl);
      return {
        [`${item.PK}-${item.SK}`]: currWikiResponse.status === 200,
      };
    }));

    preparationData = {
      ...preparationData,
      ...currentPreparationData.reduce((acc, item) => ({ ...acc, ...item }), {}),
    };

    scannedAllItems = !lastEvalKey;
  }

  return preparationData;
};

module.exports = {
  transformUp,
  transformDown,
  prepare,
  transformationNumber: 4,
};
```

For more examples of data transformation code, see the examples folder in the repository.
