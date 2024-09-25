# Agent
The frida agent that is injected. 


Setup and install the needed deps.

```sh
$ npm install
$ npm run build
$ frida -U -f com.example.android --no-pause -l _agent.js
```

### Development workflow

To continuously recompile on change, keep this running in a terminal:

```sh
$ npm run watch
```

## NativeModules

You can define .c files and have them imported into the script.

```c
# agent/mymod.c
#include <stdio.h>
void helloworld() {
    printf("hello world\n");
}
```

then import that script in your JS
```ts
// agent/index.ts

import mymod from './mymod.c.js'

// Use the C Code in frida
var cm = new CModule(mymod);
....
```

> Note `mymod.c.js` will be generated with `npm run watch` or `npm run build`