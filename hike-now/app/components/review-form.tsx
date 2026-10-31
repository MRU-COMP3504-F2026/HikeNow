"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ComponentType } from "react";
import Button from "./button";
import { CloseIcon, MehIcon, SadIcon, SmileIcon } from "./icons";
import Modal from "./modal";
import StarRating from "./star-rating";
import Tag from "./tag";
import TagPicker from "./tag-picker";
import { saveReviewToFile } from "../actions/reviews";

export type ReviewFormTrail = {
  id: string;
  name: string;
  photo: string;
  /** Equipamiento recomendado, separado por comas ("helmet, boots"). */
  equipment: string;
};

export type ReviewFormProps = {
  trails: ReviewFormTrail[];
  /** Id del trail preseleccionado. */
  initialTrailId: string;
};

type Condition = "good" | "mild" | "bad";

const TAG_OPTIONS = ["Snowy", "Rocky", "Muddy", "Clear", "Quiet", "Crowded"];
const MAX_PHOTOS = 3;
const MAX_COMMENT = 500;

const conditions: {
  value: Condition;
  label: string;
  Icon: ComponentType<{ size?: number }>;
}[] = [
  { value: "good", label: "Good", Icon: SmileIcon },
  { value: "mild", label: "Fair", Icon: MehIcon },
  { value: "bad", label: "Poor", Icon: SadIcon },
];

const labelClasses = "text-small font-medium text-ink";

function AddCircle({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="grid size-7 cursor-pointer place-items-center rounded-full border-2 border-primary text-primary transition-colors hover:bg-primary hover:text-on-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <span aria-hidden="true" className="-mt-px text-heading leading-none">
        +
      </span>
    </button>
  );
}

export default function ReviewForm({ trails, initialTrailId }: ReviewFormProps) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [trailId, setTrailId] = useState(initialTrailId);
  const [tags, setTags] = useState<string[]>([]);
  const [condition, setCondition] = useState<Condition | null>(null);
  const [rating, setRating] = useState(0);
  const [equipment, setEquipment] = useState<string[]>([]);
  const [photos, setPhotos] = useState<{ file: File; url: string }[]>([]);
  const [comments, setComments] = useState("");
  const [picker, setPicker] = useState<"tags" | "equipment" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const trail = trails.find((t) => t.id === trailId) ?? trails[0];
  const equipmentOptions = trail.equipment
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);

  // Libera las URLs temporales de las fotos al salir de la página.
  const photosRef = useRef(photos);
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);
  useEffect(
    () => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.url)),
    [],
  );

  function addPhotos(files: FileList | null) {
    if (!files) return;
    const images = Array.from(files).filter((f) => f.type.startsWith("image/"));
    setPhotos((prev) =>
      [...prev, ...images.map((file) => ({ file, url: URL.createObjectURL(file) }))].slice(
        0,
        MAX_PHOTOS,
      ),
    );
  }

  function removePhoto(index: number) {
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[index].url);
      return prev.filter((_, i) => i !== index);
    });
  }

  function changeTrail(id: string) {
    setTrailId(id);
    setEquipment([]); // el equipamiento depende del trail
  }

 async function handleSave() {
  if (!title.trim()) {
    setError("Please enter a title for your review.");
    return;
  }
  if (rating === 0) {
    setError("Please rate the trail before saving.");
    return;
  }
  setError(null);

  const newReview = {
    id: crypto.randomUUID(), // Genera un UUID único automáticamente
    hikeId: trailId,
    hikerId: "900191a2-eaa2-411f-a35e-c329520f39d7", // ID del usuario actual/sesión
    rating: rating,
    tags: tags.join(", "), // Convierte el array ["crowded", "rocky"] en "crowded, rocky"
    photo: photos[0]?.url || "", // Toma la primera foto o string vacío si no subió ninguna
    condition: condition ?? "good",
    comments: comments,
    title: title,
  };

  const result = await saveReviewToFile(newReview);

  if (result.success) {
    setSaved(true);
  } else {
    setError("Failed to save review.");
  }
}

  function goBack() {
    router.push(`/reviews/${trail.id}`);
  }

  return (
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSave();
        }}
        noValidate
        className="grid gap-10 lg:grid-cols-[1fr_minmax(0,28rem)]"
      >
        <div className="flex flex-col gap-6">
          {/* Section 1: Title */}
          <div className="flex flex-col gap-2">
            <label htmlFor="title" className={labelClasses}>
              Title <span className="text-danger">*</span>
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give your review a title"
              className="rounded-control border border-field-border bg-background px-3 py-2 text-small text-text placeholder:text-placeholder focus-visible:outline-2 focus-visible:outline-primary"
            />
          </div>

          {/* Section 2: Trail + Tags */}
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label htmlFor="trail" className={labelClasses}>
                Trail
              </label>
              <select
                id="trail"
                value={trailId}
                onChange={(e) => changeTrail(e.target.value)}
                className="rounded-control border border-border bg-background px-3 py-2 text-small text-text focus-visible:outline-2 focus-visible:outline-primary"
              >
                {trails.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <span className={labelClasses}>Tags</span>
              <div className="flex flex-wrap items-center gap-2">
                {tags.map((t) => (
                  <Tag key={t} onRemove={() => setTags(tags.filter((x) => x !== t))}>
                    {t}
                  </Tag>
                ))}
                <AddCircle label="Add tags" onClick={() => setPicker("tags")} />
              </div>
            </div>
          </div>

          {/* Section 3: Condition, Rating, Equipment */}
          <div className="grid gap-6 sm:grid-cols-[auto_auto_1fr] sm:gap-10">
            <fieldset className="flex flex-col gap-2">
              <legend className={labelClasses}>Current Condition</legend>
              <div className="flex gap-3">
                {conditions.map(({ value, label, Icon }) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={condition === value}
                    aria-label={label}
                    onClick={() => setCondition(value)}
                    className={[
                      "cursor-pointer rounded-full p-0.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                      condition === value
                        ? "bg-primary text-on-primary"
                        : "text-primary hover:bg-surface",
                    ].join(" ")}
                  >
                    <Icon size={32} />
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="flex flex-col gap-2">
              <span className={labelClasses}>
                Rating <span className="text-danger">*</span>
              </span>
              <StarRating value={rating} size={26} onChange={setRating} />
            </div>

            <div className="flex flex-col gap-2">
              <span className={labelClasses}>Equipment</span>
              <div className="flex flex-wrap items-center gap-2">
                {equipment.map((e) => (
                  <Tag
                    key={e}
                    onRemove={() => setEquipment(equipment.filter((x) => x !== e))}
                  >
                    {e}
                  </Tag>
                ))}
                <AddCircle label="Add equipment" onClick={() => setPicker("equipment")} />
              </div>
            </div>
          </div>

          {/* Section 4: Photos */}
          <div className="flex flex-col gap-2">
            <span className={labelClasses}>Photos</span>
            <div className="flex flex-wrap gap-5">
              {Array.from({ length: MAX_PHOTOS }, (_, i) => {
                const photo = photos[i];
                return photo ? (
                  <div key={photo.url} className="relative size-24 sm:size-26">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.url}
                      alt={`Review photo ${i + 1}`}
                      className="size-full rounded-2xl border-2 border-primary object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      aria-label={`Remove photo ${i + 1}`}
                      className="absolute -right-2 -top-2 grid size-6 cursor-pointer place-items-center rounded-full bg-primary text-on-primary"
                    >
                      <CloseIcon size={12} />
                    </button>
                  </div>
                ) : (
                  <button
                    key={`empty-${i}`}
                    type="button"
                    onClick={() => fileInput.current?.click()}
                    aria-label="Add photo"
                    className="grid size-24 cursor-pointer place-items-center rounded-2xl border-2 border-primary text-primary transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:size-26"
                  >
                    <span aria-hidden="true" className="text-title leading-none">
                      +
                    </span>
                  </button>
                );
              })}
            </div>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => {
                addPhotos(e.target.files);
                e.target.value = "";
              }}
            />
          </div>

          {/* Section 5: Comments */}
          <div className="flex flex-col gap-2">
            <label htmlFor="comments" className={labelClasses}>
              Comments
            </label>
            <textarea
              id="comments"
              value={comments}
              maxLength={MAX_COMMENT}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Your text here"
              rows={5}
              className="resize-y rounded-control border border-field-border bg-background p-3 text-small text-text placeholder:text-placeholder focus-visible:outline-2 focus-visible:outline-primary"
            />
            <span className="self-end text-small text-text-subtle">
              {comments.length}/{MAX_COMMENT}
            </span>
          </div>

          {error && (
            <p role="alert" className="text-small font-medium text-danger">
              {error}
            </p>
          )}

          <div className="flex gap-6">
            <Button type="submit" className="flex-1">
              Save
            </Button>
            <Button type="button" variant="danger" onClick={goBack} className="flex-1">
              Cancel
            </Button>
          </div>
        </div>

        {/* Trail Image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={trail.photo}
          alt={trail.name}
          className="hidden aspect-square w-full rounded-control border border-border object-cover lg:block"
        />
      </form>

      <Modal
        open={picker !== null}
        onClose={() => setPicker(null)}
        label={picker === "tags" ? "Choose tags" : "Choose equipment"}
      >
        {picker === "tags" && (
          <TagPicker options={TAG_OPTIONS} selected={tags} onChange={setTags} />
        )}
        {picker === "equipment" && (
          <TagPicker
            title="What equipment did you use?"
            options={equipmentOptions}
            selected={equipment}
            onChange={setEquipment}
          />
        )}
        <div className="mt-3 flex justify-center">
          <Button variant="outline" onClick={() => setPicker(null)}>
            Done
          </Button>
        </div>
      </Modal>

      <Modal open={saved} onClose={goBack} label="Review saved">
        <div className="flex flex-col gap-4 rounded-control bg-primary p-6 text-center text-on-primary">
          <div className="flex items-center justify-between">
            <span className="size-6" aria-hidden="true" />
            <h2 className="text-heading font-semibold">Saved!</h2>
            <button
              type="button"
              onClick={goBack}
              aria-label="Close"
              className="cursor-pointer rounded-full border-2 border-on-primary p-0.5"
            >
              <CloseIcon size={16} />
            </button>
          </div>
          <hr className="border-on-primary/40" />
          <p className="text-small">Thank you for sharing your experience!</p>
        </div>
      </Modal>
    </>
  );
}