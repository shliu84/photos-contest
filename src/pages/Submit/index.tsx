import { Info } from "lucide-react";
import { useSubmitForm } from "./hooks/useSubmitForm";
import { StepIndicator } from "./components/StepIndicator";
import { WorkGroupInfo } from "./components/WorkGroupInfo";
import { PhotoSection } from "./components/PhotoSection";
import { ApplicantInfo } from "./components/ApplicantInfo";
import { TermsAndSubmit } from "./components/TermsAndSubmit";

const SubmitPage = () => {
  const {
    photos, submitting, error, agreed, setAgreed,
    canAddMore, filledCount, lastPhotoRef,
    addPhotoSlot, removePhoto, clearAll, updatePhotoField, onPickFile, handleSubmit
  } = useSubmitForm();

  return (
    <div className="pt-24 pb-20 px-4 max-w-3xl mx-auto animate-fade-in-up">
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">投稿フォーム</h1>
        <p className="text-gray-500">
          以下のフォームに必要事項を入力し、作品を投稿してください。<br className="hidden md:block" />
          <span className="text-[#c0a062]">必須</span> は必須項目です。
        </p>
      </div>

      <StepIndicator />

      <form onSubmit={handleSubmit} className="bg-white p-6 md:p-10 rounded-[2rem] shadow-xl shadow-orange-100/50 border border-gray-100">
        {error && (
          <div className="mb-8 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center gap-2 animate-pulse">
            <Info size={16} /> {error}
          </div>
        )}

        {/* 1. 作品全体情報 */}
        <WorkGroupInfo />

        {/* 2. 写真エリア */}
        <PhotoSection
          photos={photos}
          canAddMore={canAddMore}
          filledCount={filledCount}
          lastPhotoRef={lastPhotoRef}
          addPhotoSlot={addPhotoSlot}
          clearAll={clearAll}
          removePhoto={removePhoto}
          updatePhotoField={updatePhotoField}
          onPickFile={onPickFile}
        />

        {/* 3. 応募者情報 */}
        <ApplicantInfo />

        {/* 規約と送信 */}
        <TermsAndSubmit agreed={agreed} setAgreed={setAgreed} submitting={submitting} />
      </form>
    </div>
  );
};

export default SubmitPage;