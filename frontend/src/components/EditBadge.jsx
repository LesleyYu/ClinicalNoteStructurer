export default function EditBadge({ visible })
{
    if (!visible) return null;
    return (
        <span className="inline-block ml-2 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide rounded-full bg-amber-100 text-amber-800 border border-amber-200">
            Edited
        </span>
    );
}
