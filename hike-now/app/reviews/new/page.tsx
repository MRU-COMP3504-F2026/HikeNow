import Footer from "../../components/footer";
import Navbar from "../../components/navbar";
import { MehIcon, SadIcon, SmileIcon } from "../../components/icons";
import StarRating from "../../components/star-rating";
import hikesData from "../../../temporary_data/hikes.json";

const addCircle = (
  <span
    aria-hidden="true"
    className="grid size-7 place-items-center rounded-full border-2 border-primary text-primary"
  >
    <span className="-mt-px text-heading leading-none">+</span>
  </span>
);

export default function NewReviewPage() {
  const selectedTrail = hikesData.find((trail) =>
    trail.name.includes("Lake Agnes"),
  );
  const trail = selectedTrail ?? hikesData[0];
  const trails = hikesData.map(({ id, name }) => ({ id, name }));

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar user={{ email: "hshar360" }} />

      <main className="flex-1 px-4 py-10 md:px-16">
        <h1 className="mb-10 text-title font-semibold text-primary">
          Leave a review
        </h1>

        <form className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,28rem)]">
          <div className="flex min-w-0 flex-col gap-8">
            <div className="grid gap-8 sm:grid-cols-[minmax(0,1fr)_12rem]">
              <div className="flex flex-col gap-2">
                <label htmlFor="trail" className="text-small font-medium text-ink">
                  Trail
                </label>
                <select
                  id="trail"
                  defaultValue={trail.id}
                  className="w-full rounded-control border border-field-border bg-background px-3 py-2 text-small text-text focus-visible:outline-2 focus-visible:outline-primary"
                >
                  {trails.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>

              <fieldset>
                <legend className="mb-2 text-small font-medium text-ink">Tags</legend>
                <div className="flex items-center gap-5">
                  {[0, 1, 2].map((index) => (
                    <span key={index}>{addCircle}</span>
                  ))}
                </div>
              </fieldset>
            </div>

            <div className="grid gap-8 sm:grid-cols-[10rem_10rem_minmax(12rem,1fr)]">
              <fieldset>
                <legend className="mb-2 text-small font-medium text-ink">
                  Current Condition
                </legend>
                <div className="flex items-center gap-3 text-primary">
                  <SmileIcon size={36} />
                  <MehIcon size={36} />
                  <SadIcon size={36} />
                </div>
              </fieldset>

              <fieldset>
                <legend className="mb-2 text-small font-medium text-ink">Rating</legend>
                <StarRating value={0} size={28} />
              </fieldset>

              <fieldset>
                <legend className="mb-2 text-small font-medium text-ink">Equipment</legend>
                <div className="flex items-center gap-5">
                  {[0, 1, 2].map((index) => (
                    <span key={index}>{addCircle}</span>
                  ))}
                </div>
              </fieldset>
            </div>

            <fieldset>
              <legend className="mb-3 text-small font-medium text-ink">Photos</legend>
              <div className="flex flex-wrap gap-8">
                {[0, 1, 2].map((index) => (
                  <button
                    key={index}
                    type="button"
                    aria-label={`Add photo ${index + 1}`}
                    className="grid size-40 cursor-pointer place-items-center rounded-[20px] border-[3px] border-primary text-primary sm:size-44"
                  >
                    <span aria-hidden="true" className="grid size-8 place-items-center rounded-full border-[3px] border-primary text-heading font-medium leading-none">
                      +
                    </span>
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="flex flex-col gap-2">
              <label htmlFor="comments" className="text-small font-medium text-ink">
                Comments
              </label>
              <textarea
                id="comments"
                rows={4}
                placeholder="Your text here"
                className="resize-y rounded-control border border-field-border bg-background p-3 text-small text-text placeholder:text-placeholder focus-visible:outline-2 focus-visible:outline-primary"
              />
              <span className="self-end text-small text-text-subtle">0/500</span>
            </div>

            <div className="flex gap-6">
              <button
                type="button"
                className="flex-1 rounded-control bg-primary px-6 py-3 text-small font-medium text-on-primary shadow-control"
              >
                Save
              </button>
              <button
                type="button"
                className="flex-1 rounded-control bg-danger px-6 py-3 text-small font-medium text-white shadow-control"
              >
                Cancel
              </button>
            </div>
          </div>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={trail.photo}
            alt={trail.name}
            className="hidden aspect-square w-full rounded-control border border-border object-cover lg:block"
          />
        </form>
      </main>

      <Footer />
    </div>
  );
}
