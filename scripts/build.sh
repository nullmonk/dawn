#!/bin/sh

# An advanced build script for the agent. Used to compile C files into ".c.js" files and also used to discover the CA certificates

function gen_c_files() {
    for i in agent/*.c; do
        if [ -f $i ]; then
            (
                echo -e "// Auto-generated from '$i'. DO NOT MODIFY\nconst code = \`";
                cat $i;
                echo -e '`;\n\nexport default code;';
            ) > $i.js
            echo "[+] Generated $i.js"
        fi
    done
    #        ((echo 'const code = `' && cat $i &&  echo -e \"\\`;\\nexport default code\") > $i.js) || echo \"No .c files to convert\"; done
}


CERT_PATH="$HOME/.mitmproxy/mitmproxy-ca-cert.pem"
function gen_proxy_config() {
    proxy_conf_dst="agent/httptoolkit/config.js"
    if [ -f $CERT_PATH ]; then
        if [ ! -f $proxy_conf_dst ]; then
        (
            echo -e "// Auto-generated from '$CERT_PATH'. DO NOT MODIFY
// Make modifications to this file to update the proxy settings configuration
export const CERT_PEM = \``cat $CERT_PATH`\`;

export const PROXY_HOST = '127.0.0.1';
export const PROXY_PORT = 8080;

// If you like, set to to true to enable extra logging:
export const DEBUG_MODE = false;

// If you find issues with non-HTTP traffic being captured (due to the
// native connect hook script) you can add ports here to exempt traffic
// on that port from being redirected. Note that this will only affect
// traffic captured by the raw connection hook - for apps using the
// system HTTP proxy settings, traffic on these ports will still be
// sent via the proxy and intercepted despite this setting.
export const IGNORED_NON_HTTP_PORTS = [];
"
        ) > $proxy_conf_dst
        echo "[+] Saved proxy settings to '$proxy_conf_dst'"
        fi
    fi
}
gen_proxy_config
gen_c_files