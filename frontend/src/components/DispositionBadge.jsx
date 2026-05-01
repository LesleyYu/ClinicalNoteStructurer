export default function DispositionBadge({ value })
{
    const value_text = value || 'Unknown';
    const base_class = 'inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full border ';
    let color_class = 'bg-gray-100 text-gray-800 border-gray-200';
    if (value_text == 'Admit') color_class = 'bg-green-100 text-green-800 border-green-200';
    if (value_text == 'Observe') color_class = 'bg-yellow-100 text-yellow-800 border-yellow-200';
    if (value_text == 'Discharge') color_class = 'bg-red-100 text-red-800 border-red-200';
    return <span className={base_class + color_class}>{value_text}</span>;
}
