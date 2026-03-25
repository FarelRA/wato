import type { WatoModule } from "@wato/sdk";

export function validateModuleGraph(modules: WatoModule[]): void {
  const names = new Set(modules.map((module) => module.manifest.name));

  for (const module of modules) {
    for (const dependency of module.manifest.dependsOn ?? []) {
      if (!names.has(dependency)) {
        throw new Error(`Module ${module.manifest.name} depends on missing module ${dependency}`);
      }
    }
  }
}
