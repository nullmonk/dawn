(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
(function (global){(function (){
"use strict";

class e {
  constructor() {
    this.handlers = new Map, this.stackDepth = new Map, this.traceState = {}, this.nextId = 1, 
    this.started = Date.now(), this.pendingEvents = [], this.flushTimer = null, this.cachedModuleResolver = null, 
    this.cachedObjcResolver = null, this.cachedSwiftResolver = null, this.flush = () => {
      if (null !== this.flushTimer && (clearTimeout(this.flushTimer), this.flushTimer = null), 
      0 === this.pendingEvents.length) return;
      const e = this.pendingEvents;
      this.pendingEvents = [], send({
        type: "events:add",
        events: e
      });
    };
  }
  init(e, t, s, n) {
    const o = global;
    o.stage = e, o.parameters = t, o.state = this.traceState;
    for (const e of s) try {
      (0, eval)(e.source);
    } catch (t) {
      throw new Error(`Unable to load ${e.filename}: ${t.stack}`);
    }
    this.start(n).catch((e => {
      send({
        type: "agent:error",
        message: e.message
      });
    }));
  }
  dispose() {
    this.flush();
  }
  update(e, t, s) {
    const n = this.handlers.get(e);
    if (void 0 === n) throw new Error("Invalid target ID");
    const o = this.parseHandler(t, s);
    n[0] = o[0], n[1] = o[1];
  }
  async start(e) {
    const t = {
      native: new Map,
      java: []
    }, s = [];
    for (const [n, o, a] of e) switch (o) {
     case "module":
      "include" === n ? this.includeModule(a, t) : this.excludeModule(a, t);
      break;

     case "function":
      "include" === n ? this.includeFunction(a, t) : this.excludeFunction(a, t);
      break;

     case "relative-function":
      "include" === n && this.includeRelativeFunction(a, t);
      break;

     case "imports":
      "include" === n && this.includeImports(a, t);
      break;

     case "objc-method":
      "include" === n ? this.includeObjCMethod(a, t) : this.excludeObjCMethod(a, t);
      break;

     case "swift-func":
      "include" === n ? this.includeSwiftFunc(a, t) : this.excludeSwiftFunc(a, t);
      break;

     case "java-method":
      s.push([ n, a ]);
      break;

     case "debug-symbol":
      "include" === n && this.includeDebugSymbol(a, t);
    }
    let n, o = !0;
    if (s.length > 0) {
      if (!Java.available) throw new Error("Java runtime is not available");
      n = new Promise(((e, n) => {
        Java.perform((() => {
          o = !1;
          for (const [e, n] of s) "include" === e ? this.includeJavaMethod(n, t) : this.excludeJavaMethod(n, t);
          this.traceJavaTargets(t.java).then(e).catch(n);
        }));
      }));
    } else n = Promise.resolve();
    await this.traceNativeTargets(t.native), o || await n, send({
      type: "agent:initialized"
    }), n.then((() => {
      send({
        type: "agent:started",
        count: this.handlers.size
      });
    }));
  }
  async traceNativeTargets(e) {
    const t = new Map, s = new Map, n = new Map;
    for (const [o, [a, r, i]] of e.entries()) {
      let e;
      switch (a) {
       case "c":
        e = t;
        break;

       case "objc":
        e = s;
        break;

       case "swift":
        e = n;
      }
      let c = e.get(r);
      void 0 === c && (c = [], e.set(r, c)), c.push([ i, ptr(o) ]);
    }
    return await Promise.all([ this.traceNativeEntries("c", t), this.traceNativeEntries("objc", s), this.traceNativeEntries("swift", n) ]);
  }
  async traceNativeEntries(e, s) {
    if (0 === s.size) return;
    const n = this.nextId, o = [], a = {
      type: "handlers:get",
      flavor: e,
      baseId: n,
      scopes: o
    };
    for (const [e, t] of s.entries()) o.push({
      name: e,
      members: t.map((e => e[0]))
    }), this.nextId += t.length;
    const {scripts: r} = await t(a);
    let i = 0;
    for (const e of s.values()) for (const [t, s] of e) {
      const e = n + i, o = "string" == typeof t ? t : t[1], a = this.parseHandler(o, r[i]);
      this.handlers.set(e, a);
      try {
        Interceptor.attach(s, this.makeNativeListenerCallbacks(e, a));
      } catch (e) {
        send({
          type: "agent:warning",
          message: `Skipping "${t}": ${e.message}`
        });
      }
      i++;
    }
  }
  async traceJavaTargets(e) {
    const s = this.nextId, n = [], o = {
      type: "handlers:get",
      flavor: "java",
      baseId: s,
      scopes: n
    };
    for (const t of e) for (const [e, {methods: s}] of t.classes.entries()) {
      const t = e.split("."), o = t[t.length - 1], a = Array.from(s.keys()).map((e => [ e, `${o}.${e}` ]));
      n.push({
        name: e,
        members: a
      }), this.nextId += a.length;
    }
    const {scripts: a} = await t(o);
    return new Promise((t => {
      Java.perform((() => {
        let n = 0;
        for (const t of e) {
          const e = Java.ClassFactory.get(t.loader);
          for (const [o, {methods: r}] of t.classes.entries()) {
            const t = e.use(o);
            for (const [e, o] of r.entries()) {
              const r = s + n, i = this.parseHandler(o, a[n]);
              this.handlers.set(r, i);
              const c = t[e];
              for (const e of c.overloads) e.implementation = this.makeJavaMethodWrapper(r, e, i);
              n++;
            }
          }
        }
        t();
      }));
    }));
  }
  makeNativeListenerCallbacks(e, t) {
    const s = this;
    return {
      onEnter(n) {
        s.invokeNativeHandler(e, t[0], this, n, ">");
      },
      onLeave(n) {
        s.invokeNativeHandler(e, t[1], this, n, "<");
      }
    };
  }
  makeJavaMethodWrapper(e, t, s) {
    const n = this;
    return function(...o) {
      return n.handleJavaInvocation(e, t, s, this, o);
    };
  }
  handleJavaInvocation(e, t, s, n, o) {
    this.invokeJavaHandler(e, s[0], n, o, ">");
    const a = t.apply(n, o), r = this.invokeJavaHandler(e, s[1], n, a, "<");
    return void 0 !== r ? r : a;
  }
  invokeNativeHandler(e, t, s, n, o) {
    const a = Date.now() - this.started, r = s.threadId, i = this.updateDepth(r, o);
    t.call(s, ((...t) => {
      this.emit([ e, a, r, i, t.join(" ") ]);
    }), n, this.traceState);
  }
  invokeJavaHandler(e, t, s, n, o) {
    const a = Date.now() - this.started, r = Process.getCurrentThreadId(), i = this.updateDepth(r, o), c = (...t) => {
      this.emit([ e, a, r, i, t.join(" ") ]);
    };
    try {
      return t.call(s, c, n, this.traceState);
    } catch (e) {
      if (void 0 !== e.$h) throw e;
      Script.nextTick((() => {
        throw e;
      }));
    }
  }
  updateDepth(e, t) {
    const s = this.stackDepth;
    let n = s.get(e) ?? 0;
    return ">" === t ? s.set(e, n + 1) : (n--, 0 !== n ? s.set(e, n) : s.delete(e)), 
    n;
  }
  parseHandler(e, t) {
    try {
      const e = (0, eval)("(" + t + ")");
      return [ e.onEnter ?? f, e.onLeave ?? f ];
    } catch (t) {
      return send({
        type: "agent:warning",
        message: `Invalid handler for "${e}": ${t.message}`
      }), [ f, f ];
    }
  }
  includeModule(e, t) {
    const {native: s} = t;
    for (const t of this.getModuleResolver().enumerateMatches(`exports:${e}!*`)) s.set(t.address.toString(), n(t));
  }
  excludeModule(e, t) {
    const {native: s} = t;
    for (const t of this.getModuleResolver().enumerateMatches(`exports:${e}!*`)) s.delete(t.address.toString());
  }
  includeFunction(e, t) {
    const s = i(e), {native: o} = t;
    for (const e of this.getModuleResolver().enumerateMatches(`exports:${s.module}!${s.function}`)) o.set(e.address.toString(), n(e));
  }
  excludeFunction(e, t) {
    const s = i(e), {native: n} = t;
    for (const e of this.getModuleResolver().enumerateMatches(`exports:${s.module}!${s.function}`)) n.delete(e.address.toString());
  }
  includeRelativeFunction(e, t) {
    const s = c(e), n = Module.getBaseAddress(s.module).add(s.offset);
    t.native.set(n.toString(), [ "c", s.module, `sub_${s.offset.toString(16)}` ]);
  }
  includeImports(e, t) {
    let s;
    if (null === e) {
      const e = Process.enumerateModules()[0].path;
      s = this.getModuleResolver().enumerateMatches(`imports:${e}!*`);
    } else s = this.getModuleResolver().enumerateMatches(`imports:${e}!*`);
    const {native: o} = t;
    for (const e of s) o.set(e.address.toString(), n(e));
  }
  includeObjCMethod(e, t) {
    const {native: s} = t;
    for (const t of this.getObjcResolver().enumerateMatches(e)) s.set(t.address.toString(), o(t));
  }
  excludeObjCMethod(e, t) {
    const {native: s} = t;
    for (const t of this.getObjcResolver().enumerateMatches(e)) s.delete(t.address.toString());
  }
  includeSwiftFunc(e, t) {
    const {native: s} = t;
    for (const t of this.getSwiftResolver().enumerateMatches(`functions:${e}`)) s.set(t.address.toString(), a(t));
  }
  excludeSwiftFunc(e, t) {
    const {native: s} = t;
    for (const t of this.getSwiftResolver().enumerateMatches(`functions:${e}`)) s.delete(t.address.toString());
  }
  includeJavaMethod(e, t) {
    const s = t.java, n = Java.enumerateMethods(e);
    for (const e of n) {
      const {loader: t} = e, n = u(s, (e => {
        const {loader: s} = e;
        return null !== s && null !== t ? s.equals(t) : s === t;
      }));
      if (void 0 === n) {
        s.push(l(e));
        continue;
      }
      const {classes: o} = n;
      for (const t of e.classes) {
        const {name: e} = t, s = o.get(e);
        if (void 0 === s) {
          o.set(e, d(t));
          continue;
        }
        const {methods: n} = s;
        for (const e of t.methods) {
          const t = h(e), s = n.get(t);
          void 0 === s ? n.set(t, e) : n.set(t, e.length > s.length ? e : s);
        }
      }
    }
  }
  excludeJavaMethod(e, t) {
    const s = t.java, n = Java.enumerateMethods(e);
    for (const e of n) {
      const {loader: t} = e, n = u(s, (e => {
        const {loader: s} = e;
        return null !== s && null !== t ? s.equals(t) : s === t;
      }));
      if (void 0 === n) continue;
      const {classes: o} = n;
      for (const t of e.classes) {
        const {name: e} = t, s = o.get(e);
        if (void 0 === s) continue;
        const {methods: n} = s;
        for (const e of t.methods) {
          const t = h(e);
          n.delete(t);
        }
      }
    }
  }
  includeDebugSymbol(e, t) {
    const {native: s} = t;
    for (const t of DebugSymbol.findFunctionsMatching(e)) s.set(t.toString(), r(t));
  }
  emit(e) {
    this.pendingEvents.push(e), null === this.flushTimer && (this.flushTimer = setTimeout(this.flush, 50));
  }
  getModuleResolver() {
    let e = this.cachedModuleResolver;
    return null === e && (e = new ApiResolver("module"), this.cachedModuleResolver = e), 
    e;
  }
  getObjcResolver() {
    let e = this.cachedObjcResolver;
    if (null === e) {
      try {
        e = new ApiResolver("objc");
      } catch (e) {
        throw new Error("Objective-C runtime is not available");
      }
      this.cachedObjcResolver = e;
    }
    return e;
  }
  getSwiftResolver() {
    let e = this.cachedSwiftResolver;
    if (null === e) {
      try {
        e = new ApiResolver("swift");
      } catch (e) {
        throw new Error("Swift runtime is not available");
      }
      this.cachedSwiftResolver = e;
    }
    return e;
  }
}

async function t(e) {
  const t = [], {type: n, flavor: o, baseId: a} = e, r = e.scopes.slice().map((({name: e, members: t}) => ({
    name: e,
    members: t.slice()
  })));
  let i = a;
  do {
    const e = [], a = {
      type: n,
      flavor: o,
      baseId: i,
      scopes: e
    };
    let c = 0;
    for (const {name: t, members: s} of r) {
      const n = [];
      e.push({
        name: t,
        members: n
      });
      let o = !1;
      for (const e of s) if (n.push(e), c++, 1e3 === c) {
        o = !0;
        break;
      }
      if (s.splice(0, n.length), o) break;
    }
    for (;0 !== r.length && 0 === r[0].members.length; ) r.splice(0, 1);
    send(a);
    const l = await s(`reply:${i}`);
    t.push(...l.scripts), i += c;
  } while (0 !== r.length);
  return {
    scripts: t
  };
}

function s(e) {
  return new Promise((t => {
    recv(e, (e => {
      t(e);
    }));
  }));
}

function n(e) {
  const [t, s] = e.name.split("!").slice(-2);
  return [ "c", t, s ];
}

function o(e) {
  const {name: t} = e, [s, n] = t.substr(2, t.length - 3).split(" ", 2);
  return [ "objc", s, [ n, t ] ];
}

function a(e) {
  const {name: t} = e, [s, n] = t.split("!", 2);
  return [ "swift", s, n ];
}

function r(e) {
  const t = DebugSymbol.fromAddress(e);
  return [ "c", t.moduleName ?? "", t.name ];
}

function i(e) {
  const t = e.split("!", 2);
  let s, n;
  return 1 === t.length ? (s = "*", n = t[0]) : (s = "" === t[0] ? "*" : t[0], n = "" === t[1] ? "*" : t[1]), 
  {
    module: s,
    function: n
  };
}

function c(e) {
  const t = e.split("!", 2);
  return {
    module: t[0],
    offset: parseInt(t[1], 16)
  };
}

function l(e) {
  return {
    loader: e.loader,
    classes: new Map(e.classes.map((e => [ e.name, d(e) ])))
  };
}

function d(e) {
  return {
    methods: new Map(e.methods.map((e => [ h(e), e ])))
  };
}

function h(e) {
  const t = e.indexOf("(");
  return -1 === t ? e : e.substr(0, t);
}

function u(e, t) {
  for (const s of e) if (t(s)) return s;
}

function f() {}

const v = new e;

rpc.exports = {
  init: v.init.bind(v),
  dispose: v.dispose.bind(v),
  update: v.update.bind(v)
};

}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}]},{},[1])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJhZ2VudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7OztBQ0FBLE1BQU07RUFBTjtJQUNZLEtBQUEsV0FBVyxJQUFJLEtBQ2YsS0FBQSxhQUFhLElBQUksS0FDakIsS0FBQSxhQUF5QixJQUN6QixLQUFBLFNBQVM7SUFDVCxLQUFBLFVBQVUsS0FBSyxPQUVmLEtBQUEsZ0JBQThCLElBQzlCLEtBQUEsYUFBa0IsTUFFbEIsS0FBQSx1QkFBMkM7SUFDM0MsS0FBQSxxQkFBeUMsTUFDekMsS0FBQSxzQkFBMEMsTUFraUIxQyxLQUFBLFFBQVE7TUFNWixJQUx3QixTQUFwQixLQUFLLGVBQ0wsYUFBYSxLQUFLLGFBQ2xCLEtBQUssYUFBYTtNQUdZLE1BQTlCLEtBQUssY0FBYyxRQUNuQjtNQUdKLE1BQU0sSUFBUyxLQUFLO01BQ3BCLEtBQUssZ0JBQWdCLElBRXJCLEtBQUs7UUFDRCxNQUFNO1FBQ047O0FBQ0Y7QUFxQ1Y7RUFybEJJLEtBQUssR0FBYyxHQUE2QixHQUEyQjtJQUN2RSxNQUFNLElBQUk7SUFDVixFQUFFLFFBQVEsR0FDVixFQUFFLGFBQWEsR0FDZixFQUFFLFFBQVEsS0FBSztJQUVmLEtBQUssTUFBTSxLQUFVLEdBQ2pCO09BQ0ksR0FBSSxNQUFNLEVBQU87TUFDbkIsT0FBTztNQUNMLE1BQU0sSUFBSSxNQUFNLGtCQUFrQixFQUFPLGFBQWEsRUFBRTs7SUFJaEUsS0FBSyxNQUFNLEdBQU0sT0FBTTtNQUNuQixLQUFLO1FBQ0QsTUFBTTtRQUNOLFNBQVMsRUFBRTs7QUFDYjtBQUVWO0VBRUE7SUFDSSxLQUFLO0FBQ1Q7RUFFQSxPQUFPLEdBQW1CLEdBQWM7SUFDcEMsTUFBTSxJQUFVLEtBQUssU0FBUyxJQUFJO0lBQ2xDLFNBQWdCLE1BQVosR0FDQSxNQUFNLElBQUksTUFBTTtJQUdwQixNQUFNLElBQWEsS0FBSyxhQUFhLEdBQU07SUFDM0MsRUFBUSxLQUFL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
