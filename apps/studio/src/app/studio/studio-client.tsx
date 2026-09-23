"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserButton } from "@clerk/nextjs";

type Workspace = { id: string; name: string; plan: string };
type Project = { id: string; name: string; status: string; startingMode: string; updatedAt: Date | string };

export default function StudioClient({ workspace, initialProjects }: { workspace: Workspace | null; initialProjects: Project[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [startingMode, setStartingMode] = useState("memory");
  const [brief, setBrief] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function createWorkspace() {
    setBusy(true); setError("");
    const response = await fetch("/api/workspaces", { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({name}) });
    if (!response.ok) setError((await response.json()).error || "Workspace creation failed.");
    else router.refresh();
    setBusy(false);
  }

  async function createProject() {
    if (!workspace) return;
    setBusy(true); setError("");
    const response = await fetch("/api/projects", { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({
      workspaceId: workspace.id, name: projectName, startingMode, brief
    })});
    if (!response.ok) setError((await response.json()).error || "Project creation failed.");
    else { setProjectName(""); setBrief(""); router.refresh(); }
    setBusy(false);
  }

  return (
    <div className="shell">
      <aside className="rail">
        <div className="brand">Evercrafted<small>STUDIO</small></div>
        <nav className="nav">
          <a href="/studio">Home</a>
          <a href="#projects">Projects</a>
          <a href="#create">New Design</a>
          <a href="#inventory">Inventory</a>
          <a href="#blueprint">Blueprint Studio</a>
          <a href="#render">Render Studio</a>
          <a href="#sell">Sell</a>
          <a href="#library">Library</a>
        </nav>
        <div style={{marginTop:"auto"}}><UserButton /></div>
      </aside>
      <main className="main">
        {!workspace ? (
          <>
            <div className="eyebrow">Workspace setup</div>
            <h1 className="title">Create your Evercrafted Studio.</h1>
            <p className="lede">Your workspace keeps your projects, inventory, blueprints, renders and costs isolated from every other maker.</p>
            <section className="card" style={{maxWidth:620,marginTop:28}}>
              <div className="field"><label>Workspace name</label><input value={name} onChange={e=>setName(e.target.value)} placeholder="Bret's Studio"/></div>
              {error && <p className="error">{error}</p>}
              <button className="btn" disabled={busy} onClick={createWorkspace}>{busy?"Creating…":"Create workspace"}</button>
            </section>
          </>
        ) : (
          <>
            <div className="eyebrow">{workspace.name} · {workspace.plan}</div>
            <h1 className="title">Your design work, together.</h1>
            <p className="lede">Start from a memory, your inventory, or a composition formula. Every step stays attached to the same project.</p>

            <section id="create" className="grid">
              <article className="card">
                <div className="eyebrow">New project</div>
                <h2>Choose a starting point</h2>
                <div className="field"><label>Project name</label><input value={projectName} onChange={e=>setProjectName(e.target.value)} placeholder="Autumn threshold"/></div>
                <div className="field"><label>Start from</label><select value={startingMode} onChange={e=>setStartingMode(e.target.value)}>
                  <option value="memory">Memory / client brief</option>
                  <option value="inventory">My inventory</option>
                  <option value="manual">Design from scratch</option>
                  <option value="existing_wreath">Existing wreath</option>
                </select></div>
                <div className="field"><label>Brief</label><textarea rows={5} value={brief} onChange={e=>setBrief(e.target.value)} placeholder="Describe the customer, memory, materials or direction."/></div>
                {error && <p className="error">{error}</p>}
                <button className="btn" disabled={busy || !projectName.trim()} onClick={createProject}>{busy?"Saving…":"Create project"}</button>
              </article>
              <article className="card"><div className="eyebrow">Engine</div><h2>AI interprets. Evercrafted places.</h2><p>The production foundation now recognizes the 12 versioned Evercrafted composition formulas. Geometry will remain deterministic and blueprint-controlled.</p><span className="pill">12 formulas loaded</span></article>
              <article className="card"><div className="eyebrow">Next connection</div><h2>Private inventory</h2><p>The next build layer connects workspace-owned materials to Blueprint Studio so designs can only consume the inventory scope you choose.</p><span className="pill">Foundation stage</span></article>
            </section>

            <section id="projects" className="card" style={{marginTop:18}}>
              <div className="eyebrow">Projects</div><h2>On your worktable</h2>
              {initialProjects.length ? initialProjects.map(p=><div className="row" key={p.id}><div><strong>{p.name}</strong><div className="muted">{p.startingMode.replaceAll("_"," ")} · {p.status}</div></div><span className="pill">Open soon</span></div>) : <p className="muted">Create your first project above.</p>}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
