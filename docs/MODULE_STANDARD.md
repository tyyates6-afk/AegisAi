# AEGIS Module Standard

Every module must register with Aegis Core.

Example:

```javascript
Aegis.register("moduleName", {

    version: "1.1.5",

    init(){},

    refresh(){},

    shutdown(){},

    status(){

        return {

            online:true,

            version:this.version

        };

    }

});
```

---

## Required Functions

### init()

Runs once during startup.

---

### refresh()

Updates module data.

---

### shutdown()

Reserved for desktop/mobile versions.

---

### status()

Returns module health information.

---

## Rules

Modules should:

- Own their own data
- Never directly modify another module
- Communicate through Core
- Be independently testable

---

## Versioning

Every module contains:

version

Example:

1.1.5