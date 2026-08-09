{
  dotnetCorePackages,
  buildDotnetModule,
  ...
}:
buildDotnetModule {
  pname = "complete-http";
  version = "0.0.1";

  src = ./.;

  projectFile = "complete-http.csproj";
  # nugetDeps = ./deps.json;

  dotnet-sdk = dotnetCorePackages.sdk_10_0;
  dotnet-runtime = dotnetCorePackages.runtime_10_0;

  executables = [ "complete-http" ];
  meta.mainProgram = "complete-http";

  selfContainedBuild = true;
}
