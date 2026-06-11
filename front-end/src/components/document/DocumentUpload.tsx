import { useState } from 'react';
import { Upload, FileText, X } from 'lucide-react';

interface DocumentUploadProps {
  onUpload: (file: File) => void;
}

export function DocumentUpload({ onUpload }: DocumentUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/pdf') {
        setSelectedFile(file);
        onUpload(file);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      onUpload(file);
    }
  };

  return (
    <div className="w-full">
      <form
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className="w-full"
      >
        <input
          type="file"
          id="file-upload"
          accept=".pdf"
          onChange={handleChange}
          className="hidden"
        />
        <label
          htmlFor="file-upload"
          className={`
            flex flex-col items-center justify-center w-full h-64
            border-2 border-dashed rounded-lg cursor-pointer
            transition-all duration-200
            ${dragActive
              ? 'border-primary bg-primary/5'
              : 'border-border bg-muted/30 hover:bg-muted/50'
            }
          `}
        >
          <div className="flex flex-col items-center justify-center gap-4">
            <Upload className={`w-12 h-12 ${dragActive ? 'text-primary' : 'text-muted-foreground'}`} />
            <div className="text-center">
              <p className="text-foreground">
                <span className="text-primary">클릭하여 업로드</span> 또는 파일을 드래그하세요
              </p>
              <p className="text-muted-foreground mt-2">PDF 파일만 지원 (최대 30MB)</p>
            </div>
          </div>
        </label>
      </form>

      {selectedFile && (
        <div className="mt-4 p-4 bg-card border border-border rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-primary" />
            <div>
              <p className="text-foreground">{selectedFile.name}</p>
              <p className="text-muted-foreground">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          </div>
          <button
            onClick={() => setSelectedFile(null)}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      )}
    </div>
  );
}
