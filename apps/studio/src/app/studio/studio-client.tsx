"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { UserButton } from "@clerk/nextjs";

type Workspace = { id: string; name: string; plan: string };
type Project = { id: string; name: string; status: string; startingMode: string; updatedAt: Date | string };

type SellerPackage = {
  id: string;
  materialCost: string | number;
  suggestedPrice: string | number;
  listingTitle: string | null;
  listingDescription: string | null;
  listingTags: unknown;
};

export default function StudioClient({ workspace, initialProjects }: { workspace: Workspace | null; initialProjects: Project[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [startingMode, setStartingMode] = useState("memory");
  const [brief, setBrief] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const firstProjectId = initialProjects[0]?.id ?? "";
  const [sellerProjectId, setSellerProjectId] = useState(firstProjectId);
  const [sellerBusy, setSellerBusy] = useState(false);
  const [sellerError, setSellerError] = useState("");
  const [sellerPackage, setSellerPackage] = useState<SellerPackage | null>(null);
  const [laborMinutes, setLaborMinutes] = useState(90);
  const [laborRateHour, setLaborRateHour] = useState(20);
  const [packagingCost, setPackagingCost] = useState(8);
  const [platformFeePct, setPlatformFeePct] = useState(10);
  const [targetMarginPct, setTargetMarginPct] = useState(60);

  const [reverseFile, setReverseFile] = useState<File | null>(null);
  const [reversePreviewUrl, setReversePreviewUrl] = useState("");
  const [reverseProjectName, setReverseProjectName] = useState("Imported signature wreath");
  const [reverseImportId, setReverseImportId] = useState("");
  const [reverseStatus, setReverseStatus] = useState("Not started");
  const [reverseSummary, setReverseSummary] = useState("");
  const [reverseFormula, setReverseFormula] = useState("");
  const [reverseBusy, setReverseBusy] = useState(false);
  const [reverseError, setReverseError] = useState("");

  const listingTags = useMemo(() => {
    const tags = sellerPackage?.listingTags;
    return Array.isArray(tags) ? tags.map(String) : [];
  }, [sellerPackage]);

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

  async function buildSellerPackage() {
    if (!sellerProjectId) return;
    setSellerBusy(true); setSellerError("");
    const response = await fetch("/api/product-package", {
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({
        projectId:sellerProjectId,
        laborMinutes,laborRateHour,packagingCost,platformFeePct,targetMarginPct,
      }),
    });
    const data = await response.json();
    if (!response.ok) setSellerError(data.error || "Seller package generation failed.");
    else setSellerPackage(data.package);
    setSellerBusy(false);
  }

  async function uploadAndAnalyzeReverse() {
    if (!workspace || !reverseFile) return;
    setReverseBusy(true); setReverseError(""); setReverseStatus("Uploading private image…");
    try {
      const uploadResponse = await fetch(
        "/api/reverse/upload?workspaceId="+encodeURIComponent(workspace.id)+"&filename="+encodeURIComponent(reverseFile.name),
        {
          method:"POST",
          headers:{"content-type":reverseFile.type},
          body:reverseFile,
        }
      );
      const uploaded = await uploadResponse.json();
      if (!uploadResponse.ok) throw new Error(uploaded.error || "Could not upload wreath image.");

      setReverseImportId(uploaded.import.id);
      setReversePreviewUrl(uploaded.sourceUrl);
      setReverseStatus("Analyzing image…");

      const analysisResponse = await fetch("/api/reverse", {
        method:"POST",
        headers:{"content-type":"application/json"},
        body:JSON.stringify({ action:"analyze", id:uploaded.import.id }),
      });
      const analyzed = await analysisResponse.json();
      if (!analysisResponse.ok) throw new Error(analyzed.error || "Vision analysis failed.");
      setReverseStatus("Needs review");
      setReverseSummary(String(analyzed.import?.analysis?.summary || ""));
      setReverseFormula(String(analyzed.import?.proposedFormulaId || ""));
    } catch (e) {
      setReverseStatus("Manual review available");
      setReverseError(e instanceof Error ? e.message : "Reverse analysis failed.");
    } finally {
      setReverseBusy(false);
    }
  }

  async function commitReverse() {
    if (!reverseImportId) return;
    setReverseBusy(true); setReverseError("");
    const response = await fetch("/api/reverse", {
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({ action:"commit", id:reverseImportId, projectName:reverseProjectName }),
    });
    const data = await response.json();
    if (!response.ok) setReverseError(data.error || "Could not commit reverse import.");
    else {
      setReverseStatus("Committed to project");
      router.refresh();
    }
    setReverseBusy(false);
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
          <a href="#sell">Product & Listing</a>
          <a href="#reverse">Reverse Engineer</a>
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
            <p className="lede">Start from a memory, inventory, composition formula or an existing wreath. Every step stays attached to the same project.</p>

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
              <article className="card"><div className="eyebrow">Engine</div><h2>AI interprets. Evercrafted places.</h2><p>The production foundation recognizes 12 versioned composition formulas. Geometry remains deterministic and blueprint-controlled.</p><span className="pill">12 formulas loaded</span></article>
              <article className="card"><div className="eyebrow">Workflow</div><h2>One project record</h2><p>Blueprint, render, reverse import, costing and selling assets are being connected to the same canonical project instead of separate tools.</p><span className="pill">SaaS foundation</span></article>
            </section>

            <section id="projects" className="card" style={{marginTop:18}}>
              <div className="eyebrow">Projects</div><h2>On your worktable</h2>
              {initialProjects.length ? initialProjects.map(p=><div className="row" key={p.id}><div><strong>{p.name}</strong><div className="muted">{p.startingMode.replaceAll("_"," ")} · {p.status}</div></div><span className="pill">Project</span></div>) : <p className="muted">Create your first project above.</p>}
            </section>

            <section id="sell" className="card feature-section">
              <div className="eyebrow">Product & Listing Studio</div><h2>Build it. Price it. Sell it.</h2>
              <div className="two-col">
                <div>
                  <div className="field"><label>Project</label><select value={sellerProjectId} onChange={e=>setSellerProjectId(e.target.value)}>
                    <option value="">Choose project</option>{initialProjects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                  </select></div>
                  <div className="mini-grid">
                    <div className="field"><label>Labor minutes</label><input type="number" value={laborMinutes} onChange={e=>setLaborMinutes(Number(e.target.value))}/></div>
                    <div className="field"><label>Labor rate/hour</label><input type="number" value={laborRateHour} onChange={e=>setLaborRateHour(Number(e.target.value))}/></div>
                    <div className="field"><label>Packaging</label><input type="number" value={packagingCost} onChange={e=>setPackagingCost(Number(e.target.value))}/></div>
                    <div className="field"><label>Platform fee %</label><input type="number" value={platformFeePct} onChange={e=>setPlatformFeePct(Number(e.target.value))}/></div>
                    <div className="field"><label>Target margin %</label><input type="number" value={targetMarginPct} onChange={e=>setTargetMarginPct(Number(e.target.value))}/></div>
                  </div>
                  {sellerError && <p className="error">{sellerError}</p>}
                  <button className="btn" disabled={sellerBusy || !sellerProjectId} onClick={buildSellerPackage}>{sellerBusy?"Calculating…":"Build seller package"}</button>
                </div>
                <div className="seller-result">
                  <div><span className="muted">Material cost</span><strong>{"$"+Number(sellerPackage?.materialCost || 0).toFixed(2)}</strong></div>
                  <div><span className="muted">Suggested retail</span><strong>{"$"+Number(sellerPackage?.suggestedPrice || 0).toFixed(2)}</strong></div>
                  {sellerPackage && <>
                    <div className="field"><label>Listing title</label><input value={sellerPackage.listingTitle || ""} readOnly/></div>
                    <div className="field"><label>Description</label><textarea rows={8} value={sellerPackage.listingDescription || ""} readOnly/></div>
                    <div>{listingTags.map(tag=><span className="pill tag-pill" key={tag}>{tag}</span>)}</div>
                  </>}
                </div>
              </div>
            </section>

            <section id="reverse" className="card feature-section">
              <div className="eyebrow">Reverse Engineer</div><h2>Existing wreath → editable Evercrafted project.</h2>
              <p className="muted">Upload a finished wreath directly. The image is stored in private Vercel Blob, previewed through an authenticated route, and analyzed server-side without exposing a permanent public source URL.</p>
              <div className="two-col">
                <div>
                  <div className="field"><label>Wreath image</label><input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>{
                    const file=e.target.files?.[0] ?? null;
                    setReverseFile(file);
                    setReversePreviewUrl(file ? URL.createObjectURL(file) : "");
                    if (file && reverseProjectName==="Imported signature wreath") setReverseProjectName(file.name.replace(/\.[^.]+$/,""));
                  }}/></div>
                  <div className="field"><label>Project name</label><input value={reverseProjectName} onChange={e=>setReverseProjectName(e.target.value)}/></div>
                  {reverseError && <p className="error">{reverseError}</p>}
                  <div className="actions">
                    <button className="btn" disabled={reverseBusy || !reverseFile} onClick={uploadAndAnalyzeReverse}>{reverseBusy?"Working…":"Upload & analyze"}</button>
                    <button className="btn secondary" disabled={reverseBusy || !reverseImportId} onClick={commitReverse}>Commit as project</button>
                  </div>
                </div>
                <div className="reverse-result">
                  {reversePreviewUrl ? <img src={reversePreviewUrl} alt="Reverse engineer source" /> : <div className="image-placeholder">Source image preview</div>}
                  <div className="row"><strong>Status</strong><span className="pill">{reverseStatus}</span></div>
                  {reverseFormula && <div className="row"><strong>Formula</strong><span>{reverseFormula.replaceAll("_"," ")}</span></div>}
                  {reverseSummary && <p className="muted">{reverseSummary}</p>}
                </div>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
