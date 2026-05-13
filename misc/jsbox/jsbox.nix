{
  importNpmLock,
  lib,
  nodejs_24,
  stdenv,
}:
let
  nodeModules = importNpmLock.buildNodeModules {
    package = lib.importJSON ./package.json;
    packageLock = lib.importJSON ./package-lock.json;

    nodejs = nodejs_24;
  };
in
stdenv.mkDerivation {
  pname = "jsbox";
  version = "0.0.0";

  src = builtins.filterSource (path: type: (baseNameOf path) == "jsbox.js") ./.;

  buildPhase = ''
    mkdir -p $out

    cp -R ${nodeModules}/node_modules $out
    cp ${nodeModules}/package.json $out
    cp ${nodeModules}/package-lock.json $out

    # fix perms before rm, gets set to r--r--r-- anyway for nix store
    chmod -R u+w $out/node_modules

    # get rid of these so nodejs_24 doesn't end up in the closure
    rm -rf $out/node_modules/.bin
    rm -rf $out/node_modules/node-gyp-build/{bin,build-test,optional}.js

    cp jsbox.js $out
  '';
}
