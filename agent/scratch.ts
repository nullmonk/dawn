var mod = Process.enumerateModules()[0];
mod.enumerateImports().forEach((m) => {
	send({
		"class": "import",
		"type": m.type,
		"name": m.name,
	})
})
mod.enumerateExports().forEach((m) => {
	send({
		"class": "export",
		"type": m.type,
		"name": m.name,
	})
})
mod.enumerateSymbols().forEach((m) => {
	send({
		"class": "sym",
		"type": m.type,
		"name": m.name,
	})
})
Interceptor.attach(Module.getExportByName(null, 'open'), {
	onEnter: function (args) {
		var newArg = Memory.allocUtf8String("main.go")
		var orig = args[0].readUtf8String();
		send({
			type: 'open',
			path: orig,
			new: newArg.readUtf8String()
		});
		args[0].writeUtf8String('main.go')
	}
});
/*
Interceptor.attach(DebugSymbol.fromName("main").address, {
	onEnter: function (args) {
		send({"func":"main", "argc": "arg"})
	}
});
*/