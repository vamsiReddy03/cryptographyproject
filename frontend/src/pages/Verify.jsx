import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useDropzone } from "react-dropzone";
import { ethers } from "ethers";
import { 
  Search, FileText, CheckCircle2, XCircle, FileWarning, ExternalLink, Calendar, 
  User, BookOpen, Award, Building, QrCode, ShieldCheck, MessageSquare, Send, Sparkles, AlertTriangle, Layers, Clock
} from "lucide-react";
import { getContractInstance } from "../services/ethereum";
import api from "../services/api";
import { generateCertificatePDF } from "../services/certificateGenerator";

// Helper to compute file hash locally
async function calculateSHA256(file) {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return `0x${hashArray.map(b => b.toString(16).padStart(2, "0")).join("")}`;
}

export default function Verify() {
  const [searchParams] = useSearchParams();
  const urlHash = searchParams.get("hash");
  const urlId = searchParams.get("id");

  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState("id"); // 'id', 'hash'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fileHash, setFileHash] = useState("");
  const [fileName, setFileName] = useState("");

  const [certData, setCertData] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [verificationStatus, setVerificationStatus] = useState("idle"); // 'idle', 'loading', 'verified', 'invalid', 'revoked'

  // AI Security Verification Scanner
  const [aiReport, setAiReport] = useState(null);
  const [aiScanning, setAiScanning] = useState(false);

  // AI Assistant Chatbot States
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([
    { role: "assistant", content: "Hi! I am your CertiChain AI verification assistant. Paste a Certificate ID, hash, or ask me how to verify a document." }
  ]);
  const [chatLoading, setChatLoading] = useState(false);

  // Fetch certificate details & history from backend + contract
  const queryContract = async (hashOrId, queryMethod, inferredMethod = "ID") => {
    setLoading(true);
    setError("");
    setCertData(null);
    setTimeline([]);
    setVerificationStatus("loading");

    try {
      // 1. Fetch from DB details API
      const res = await api.get(`/certificates/verify?type=${queryMethod}&query=${hashOrId}&method=${inferredMethod}`);
      if (res.data && res.data.data) {
        const data = res.data.data;
        setCertData(data);
        setVerificationStatus(data.isValid ? "verified" : data.isRevoked ? "revoked" : "invalid");

        // Log local verification transaction
        await api.get(`/transactions/analytics`); // triggers audit update (optional)

        // 2. Fetch version timeline history
        try {
          const historyRes = await api.get(`/certificates/timeline/${data.certificateId}`);
          if (historyRes.data && historyRes.data.versions) {
            setTimeline(historyRes.data.versions);
          }
        } catch (timelineErr) {
          console.warn("Timeline fetch error:", timelineErr.message);
        }
      } else {
        setVerificationStatus("invalid");
      }
    } catch (err) {
      console.error(err);
      setError("No certificate matching this query found in the ledger.");
      setVerificationStatus("invalid");
    } finally {
      setLoading(false);
    }
  };

  // Download Verified PDF Certificate
  const handleDownloadVerifiedPDF = async () => {
    if (!certData) return;
    try {
      const { doc, fileName } = await generateCertificatePDF({
        certificateId: certData.certificateId,
        studentName: certData.studentName,
        rollNumber: certData.studentRollNo,
        courseName: certData.courseName,
        grade: certData.grade,
        institutionName: certData.institutionName || "Rizvi College of Engineering",
        issueDate: new Date(certData.issueDate).toLocaleDateString()
      });
      doc.save(fileName);
    } catch (err) {
      console.error("PDF download error:", err);
      alert("Error generating PDF document: " + err.message);
    }
  };

  // Drag and drop upload handler
  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setFileName(file.name);
    setVerificationStatus("loading");
    setLoading(true);
    setAiScanning(true);
    setAiReport(null);

    try {
      const hash = await calculateSHA256(file);
      setFileHash(hash);
      setSearchQuery(hash);
      setSearchType("hash");

      // Trigger standard ledger query
      await queryContract(hash, "hash", "PDF_UPLOAD");

      // Execute AI Fraud Check on PDF upload
      const formData = new FormData();
      formData.append("file", file);
      
      const fraudRes = await api.post("/certificates/fraud-check", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setAiReport(fraudRes.data);
    } catch (err) {
      console.error(err);
      setError("Error computing hash or scanning file.");
      setVerificationStatus("idle");
    } finally {
      setLoading(false);
      setAiScanning(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    multiple: false
  });

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    queryContract(searchQuery.trim(), searchType, searchType === "id" ? "ID" : "HASH");
  };

  // Chat submit
  const handleChatSend = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput;
    setChatMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setChatInput("");
    setChatLoading(true);

    try {
      const chatRes = await api.post("/ai/chat", { message: userMsg });
      setChatMessages((prev) => [...prev, { role: "assistant", content: chatRes.data.reply }]);
    } catch (err) {
      setChatMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I am having trouble connecting to the CertiChain AI node right now." }]);
    } finally {
      setChatLoading(false);
    }
  };

  // Auto query if parameters are passed via URL (representing QR scanning)
  useEffect(() => {
    if (urlHash) {
      setSearchQuery(urlHash);
      setSearchType("hash");
      queryContract(urlHash, "hash", "QR");
    } else if (urlId) {
      setSearchQuery(urlId);
      setSearchType("id");
      queryContract(urlId, "id", "QR");
    }
  }, [urlHash, urlId]);

  return (
    <div className="space-y-12 py-4 max-w-6xl mx-auto text-left relative">
      
      {/* Hero Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center py-4 border-b border-slate-900 pb-10">
        <div className="lg:col-span-8 space-y-5">
          <div className="inline-flex items-center space-x-2 bg-brand-purple/10 border border-brand-purple/20 text-brand-purple px-3 py-1 rounded-full text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5 mr-1" />
            <span>AI-Powered Ledger Integrity Scan</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent leading-[1.1] text-glow-purple">
            Blockchain Credential <br /> Verification Node
          </h1>
          <p className="text-slate-400 max-w-2xl text-sm md:text-base leading-relaxed">
            Verify academic certificates instantly. Upload the PDF file to verify hash integrity and review the on-chain version timeline or lookup with the Certificate ID.
          </p>
        </div>

        {/* Small Stats / QR Scanner info */}
        <div className="lg:col-span-4 glass-panel p-5 rounded-2xl border border-slate-800/80 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 font-mono block">LEDGER PROTOCOL</span>
            <span className="text-xs font-bold text-white block">EVM Proof-of-Authority</span>
            <span className="text-[10px] text-brand-cyan font-mono text-glow-cyan font-bold block">ACTIVE GATEWAY</span>
          </div>
          <div className="bg-slate-900 border border-slate-850 p-2 rounded-xl text-slate-450">
            <QrCode className="h-10 w-10 text-white opacity-80" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Left Column: Drag & Drop PDF */}
        <div id="pdf-dropzone" className="space-y-4">
          <h2 className="text-lg font-bold flex items-center space-x-2 text-slate-200">
            <FileText className="h-5 w-5 text-brand-purple" />
            <span>Upload Certificate PDF</span>
          </h2>

          <div
            {...getRootProps()}
            className={`glass-panel border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 ${
              isDragActive
                ? "border-brand-purple bg-brand-purple/5 scale-[1.01]"
                : "border-slate-800 hover:border-slate-700 hover:bg-slate-900/10"
            }`}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center space-y-3">
              <div className="bg-slate-900 border border-slate-800 p-3 rounded-full text-brand-purple">
                <FileText className="h-8 w-8 text-glow-purple" />
              </div>
              <div>
                <p className="font-semibold text-slate-200 text-sm">
                  {isDragActive ? "Drop the PDF here..." : "Drag & drop certificate PDF here"}
                </p>
                <p className="text-xs text-slate-550 mt-1">or click to browse from files</p>
              </div>
              <span className="inline-block text-[9px] bg-slate-900 border border-slate-800 text-slate-450 font-mono px-2 py-0.5 rounded uppercase">
                PDF format (Max 10MB)
              </span>
            </div>
          </div>

          {fileName && (
            <div className="bg-slate-900/60 border border-slate-850 rounded-xl p-3 flex justify-between items-center text-xs font-mono text-slate-400">
              <span className="truncate max-w-[200px]" title={fileName}>{fileName}</span>
              <span className="text-slate-550 text-[10px]">{fileHash.slice(0, 10)}...{fileHash.slice(-8)}</span>
            </div>
          )}
        </div>

        {/* Right Column: Search bar */}
        <div id="registry-search" className="space-y-4">
          <h2 className="text-lg font-bold flex items-center space-x-2 text-slate-200">
            <Search className="h-5 w-5 text-brand-cyan" />
            <span>Search Ledger Details</span>
          </h2>

          <form onSubmit={handleSearchSubmit} className="glass-panel rounded-2xl p-6 space-y-4 border border-slate-850">
            <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-1">
              <button
                type="button"
                onClick={() => setSearchType("id")}
                className={`flex-1 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  searchType === "id"
                    ? "bg-brand-cyan/20 text-white border border-brand-cyan/20"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Certificate ID
              </button>
              <button
                type="button"
                onClick={() => setSearchType("hash")}
                className={`flex-1 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  searchType === "hash"
                    ? "bg-brand-purple/20 text-white border border-brand-purple/20"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                SHA-256 Hash
              </button>
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder={searchType === "id" ? "e.g. CER-2026-101" : "e.g. 0x5d93b..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-3 pr-10 py-2.5 rounded-xl text-sm glass-input font-mono"
              />
              <button
                type="submit"
                className="absolute right-2 top-2 p-1.5 text-slate-400 hover:text-white bg-slate-950 border border-slate-850 rounded-lg cursor-pointer"
              >
                <Search className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="text-[10px] text-slate-500 font-mono">
              Addresses ledger checks directly on the blockchain registry.
            </p>
          </form>
        </div>
      </div>

      {/* Verification Result Display */}
      {verificationStatus !== "idle" && (
        <div className="mt-8 transition-all duration-300 space-y-6">
          {verificationStatus === "loading" && (
            <div className="glass-panel rounded-2xl p-12 flex flex-col items-center justify-center space-y-4">
              <div className="h-8 w-8 border-4 border-slate-800 border-t-brand-purple rounded-full animate-spin"></div>
              <p className="text-xs text-slate-500 font-mono">Querying blockchain registry records...</p>
            </div>
          )}

          {verificationStatus === "verified" && certData && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left 2 Cols: Main verification details */}
              <div className="lg:col-span-2 glass-panel-glow verified-border-draw rounded-3xl p-6 md:p-8 space-y-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 h-40 w-40 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none"></div>

                <div className="flex items-center space-x-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-2.5 rounded-2xl w-fit">
                  <CheckCircle2 className="h-5.5 w-5.5" />
                  <div>
                    <div className="font-display font-bold text-xs tracking-wide uppercase leading-none">VERIFIED AUTHENTIC</div>
                    <div className="text-[9px] font-mono text-emerald-400/80 mt-0.5 leading-none">Secured on Ethereum Ledger</div>
                  </div>
                </div>

                <div className="bg-slate-950/70 border border-slate-900 rounded-2xl p-6 space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-900 pb-4 gap-4">
                    <div>
                      <h3 className="text-lg font-bold font-display text-white">{certData.courseName}</h3>
                      <p className="text-xs font-semibold text-brand-cyan tracking-wider flex items-center space-x-1 mt-1">
                        <Building className="h-3 w-3" />
                        <span>{certData.institutionName}</span>
                      </p>
                    </div>
                    <div className="text-left md:text-right">
                      <span className="text-slate-550 text-[9px] font-mono block">CERTIFICATE ID</span>
                      <span className="text-slate-300 text-xs font-mono font-bold bg-slate-900 border border-slate-850 px-2 py-0.5 rounded-md">{certData.certificateId}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3">
                        <User className="h-4 w-4 text-slate-500" />
                        <div>
                          <span className="text-slate-500 text-[9px] block">Recipient Student</span>
                          <span className="font-bold text-slate-200">{certData.studentName}</span>
                          <span className="text-slate-450 text-[10px] font-mono ml-2">({certData.studentRollNo})</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <BookOpen className="h-4 w-4 text-slate-500" />
                        <div>
                          <span className="text-slate-500 text-[9px] block">Department / Major</span>
                          <span className="font-semibold text-slate-200">{certData.departmentName}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center space-x-3">
                        <Award className="h-4 w-4 text-slate-500" />
                        <div>
                          <span className="text-slate-500 text-[9px] block">Grade Achieved</span>
                          <span className="font-bold text-slate-200">{certData.grade}</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <Calendar className="h-4 w-4 text-slate-500" />
                        <div>
                          <span className="text-slate-500 text-[9px] block">Issue Timestamp</span>
                          <span className="font-semibold text-slate-200">
                            {new Date(certData.issueDate).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between bg-slate-900/40 border border-slate-850 rounded-xl p-4 gap-4">
                    <div className="space-y-1">
                      <span className="text-[9px] text-slate-500 font-mono block leading-none">IPFS STORAGE CID</span>
                      <span className="font-mono text-xs text-brand-purple font-bold break-all">{certData.ipfsCID}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleDownloadVerifiedPDF}
                      className="flex items-center justify-center space-x-2 bg-gradient-to-r from-brand-purple to-indigo-600 hover:from-brand-purple hover:to-indigo-500 text-white text-xs font-semibold px-4 py-2.5 rounded-lg border border-purple-500/30 transition-all shrink-0 cursor-pointer shadow-lg shadow-purple-950/50"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      <span>Download Official PDF Certificate</span>
                    </button>
                  </div>

                  {certData.txHash && (
                    <div className="p-3 bg-slate-950/80 border border-slate-900 rounded-xl flex justify-between items-center text-[10px] font-mono text-slate-400">
                      <span>Transaction Anchor: <code className="text-brand-cyan">{certData.txHash}</code></span>
                      <a 
                        href={`https://sepolia.etherscan.io/tx/${certData.txHash}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-slate-500 hover:text-white underline flex items-center space-x-0.5 shrink-0"
                      >
                        <span>Etherscan Link</span>
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Right 1 Col: Versioning Timeline history */}
              <div className="glass-panel p-6 rounded-3xl border border-slate-800/80 space-y-4">
                <h3 className="font-bold font-display text-sm text-slate-200 flex items-center space-x-1.5 border-b border-slate-900 pb-3">
                  <Clock className="h-4 w-4 text-brand-purple animate-pulse" />
                  <span>Credential Version Timeline</span>
                </h3>
                
                {timeline.length === 0 ? (
                  <p className="text-xs text-slate-500">No version history timeline available.</p>
                ) : (
                  <div className="relative border-l border-slate-800 pl-4 ml-2 py-2 space-y-6">
                    {timeline.map((version) => (
                      <div key={version.id} className="relative text-left">
                        {/* Dot indicator */}
                        <span className={`absolute -left-[21px] top-1.5 h-3.5 w-3.5 rounded-full border-2 ${
                          version.versionNumber === certData.versionNumber 
                            ? "bg-brand-cyan border-brand-bg animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.5)]" 
                            : "bg-slate-900 border-slate-700"
                        }`}></span>
                        
                        <div className="space-y-0.5">
                          <div className="flex justify-between items-center">
                            <span className={`text-[10px] font-bold uppercase ${
                              version.versionNumber === certData.versionNumber ? "text-brand-cyan" : "text-slate-550 font-medium"
                            }`}>
                              Version V{version.versionNumber} {version.versionNumber === certData.versionNumber ? "(Active)" : "(Superseded)"}
                            </span>
                            <span className="text-[9px] text-slate-500 font-mono">
                              {new Date(version.issueDate).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-350">{version.remarks || "Updated details"}</p>
                          <div className="text-[9px] text-slate-500 font-mono break-all leading-tight">
                            Hash: {version.pdfHash.slice(0, 16)}...
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {verificationStatus === "revoked" && certData && (
            <div className="glass-panel border-red-900 bg-red-950/10 rounded-3xl p-8 space-y-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 h-40 w-40 bg-red-500/5 rounded-full blur-2xl pointer-events-none"></div>

              <div className="flex items-center space-x-3 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-2.5 rounded-2xl w-fit">
                <FileWarning className="h-6 w-6 animate-pulse" />
                <div>
                  <div className="font-display font-bold text-sm tracking-wide uppercase leading-none text-glow-red">CERTIFICATE REVOKED</div>
                  <div className="text-[10px] font-mono text-red-400/80 mt-0.5 leading-none">Declared invalid by the institution</div>
                </div>
              </div>

              <div className="bg-slate-950/70 border border-slate-900 rounded-2xl p-6 opacity-80 space-y-4">
                <p className="text-sm text-slate-350">
                  The certificate ID <strong className="text-white">{certData.certificateId}</strong> issued to student <strong className="text-white">{certData.studentName}</strong> has been officially **REVOKED** from the blockchain registry.
                </p>
                {certData.txHash && (
                  <p className="text-xs font-mono text-slate-500">Revocation block hash: <code className="text-red-400">{certData.txHash}</code></p>
                )}
              </div>
            </div>
          )}

          {verificationStatus === "invalid" && (
            <div className="glass-panel border-amber-900 bg-amber-950/10 rounded-3xl p-8 space-y-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 h-40 w-40 bg-amber-500/5 rounded-full blur-2xl pointer-events-none"></div>

              <div className="flex items-center space-x-3 bg-amber-500/10 border border-amber-500/30 text-amber-400 px-4 py-2.5 rounded-2xl w-fit">
                <XCircle className="h-6 w-6" />
                <div>
                  <div className="font-display font-bold text-sm tracking-wide uppercase leading-none">REGISTRY CHECK FAILED</div>
                  <div className="text-[10px] font-mono text-amber-400/80 mt-0.5 leading-none">Cryptographic hash check not matching</div>
                </div>
              </div>

              <div className="bg-slate-950/70 border border-slate-900 rounded-2xl p-6 space-y-3">
                <p className="text-sm text-slate-300">
                  We could not find any matching record in the blockchain ledger.
                </p>
                <div className="text-xs text-slate-500 space-y-1 font-mono">
                  <p>Typical failure reasons:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>The PDF file was modified (even small text corrections change the hash completely).</li>
                    <li>The ID is typed incorrectly.</li>
                    <li>The certificate transaction is pending approval in the workflow pipeline.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-950/20 border border-red-900 text-red-300 rounded-xl p-4 text-xs font-mono">
              ⚠️ {error}
            </div>
          )}

          {/* AI Security Scan Report display (only for PDF upload checks) */}
          {aiScanning && (
            <div className="glass-panel border-brand-purple/20 p-6 rounded-2xl flex items-center justify-between animate-pulse">
              <div className="flex items-center space-x-3">
                <Sparkles className="h-5 w-5 text-brand-purple" />
                <span className="text-xs font-mono text-slate-400">AI scanning document signatures and layout anomalies...</span>
              </div>
            </div>
          )}

          {aiReport && (
            <div className={`p-5 rounded-2xl border ${
              aiReport.authentic 
                ? "bg-emerald-950/5 border-emerald-900/30 text-emerald-300"
                : aiReport.flag === "CRITICAL"
                ? "bg-red-950/10 border-red-900/35 text-red-300"
                : "bg-amber-950/10 border-amber-900/30 text-amber-300"
            }`}>
              <div className="flex justify-between items-center border-b border-slate-900 pb-3 mb-3">
                <div className="flex items-center space-x-2">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-wider font-display">AI Fraud Scan Report</span>
                </div>
                <div className="text-[10px] font-mono bg-slate-900 border border-slate-800 px-2 py-0.5 rounded font-bold text-white">
                  Confidence: {aiReport.confidence || "100%"}
                </div>
              </div>
              <p className="text-xs">{aiReport.message}</p>
            </div>
          )}
        </div>
      )}

      {/* Floating AI Helper Chatbot Widget */}
      <div className="fixed bottom-6 right-6 z-50">
        {chatOpen ? (
          <div className="bg-slate-900/95 border border-slate-800 rounded-2xl w-80 h-[380px] flex flex-col shadow-[0_15px_50px_rgba(0,0,0,0.7)] relative overflow-hidden transition-all duration-300">
            {/* Header */}
            <div className="bg-gradient-to-r from-brand-purple to-indigo-700 px-4 py-3 text-white flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <Sparkles className="h-4 w-4 animate-spin-slow" />
                <span className="font-bold text-xs">AI Chatbot Assistant</span>
              </div>
              <button 
                onClick={() => setChatOpen(false)}
                className="text-white/60 hover:text-white font-bold text-xs"
              >
                ✕
              </button>
            </div>

            {/* Messages box */}
            <div className="flex-1 p-3 overflow-y-auto space-y-3 scrollbar-thin text-xs">
              {chatMessages.map((msg, idx) => (
                <div 
                  key={idx} 
                  className={`p-2.5 rounded-xl max-w-[85%] leading-normal ${
                    msg.role === "user" 
                      ? "bg-brand-purple/20 text-white border border-brand-purple/20 ml-auto" 
                      : "bg-slate-950 border border-slate-850 text-slate-350"
                  }`}
                >
                  {msg.content}
                </div>
              ))}
              {chatLoading && (
                <div className="bg-slate-950 border border-slate-850 p-2 rounded-xl w-fit flex space-x-1.5 items-center">
                  <span className="h-1.5 w-1.5 bg-brand-purple rounded-full animate-bounce"></span>
                  <span className="h-1.5 w-1.5 bg-brand-purple rounded-full animate-bounce [animation-delay:0.2s]"></span>
                  <span className="h-1.5 w-1.5 bg-brand-purple rounded-full animate-bounce [animation-delay:0.4s]"></span>
                </div>
              )}
            </div>

            {/* Input form */}
            <form onSubmit={handleChatSend} className="p-2 border-t border-slate-850 bg-slate-950 flex space-x-2">
              <input
                type="text"
                placeholder="Ask about versioning or check an ID..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-lg text-[11px] glass-input outline-none"
              />
              <button 
                type="submit"
                className="p-1.5 rounded-lg bg-brand-purple text-white flex items-center justify-center cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        ) : (
          <button
            onClick={() => setChatOpen(true)}
            className="h-12 w-12 rounded-full bg-gradient-to-r from-brand-purple to-indigo-600 border border-brand-purple/35 text-white flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_25px_rgba(139,92,246,0.5)] transition-all cursor-pointer hover:scale-105 active:scale-95 animate-bounce-slow"
          >
            <MessageSquare className="h-5.5 w-5.5" />
          </button>
        )}
      </div>

    </div>
  );
}
