<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SystemSetting extends Model
{
    protected $table = 'system_settings';
    protected $primaryKey = 'key';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'key',
        'value',
        'type',
        'group',
    ];

    /**
     * Retrieve a typed setting value with optional fallback.
     */
    public static function getValue(string $key, mixed $default = null): mixed
    {
        $setting = static::find($key);
        if (! $setting || $setting->value === null) {
            return $default;
        }

        return match ($setting->type) {
            'integer', 'int' => (int) $setting->value,
            'boolean', 'bool' => filter_var($setting->value, FILTER_VALIDATE_BOOLEAN),
            'json' => json_decode($setting->value, true),
            default => $setting->value,
        };
    }

    /**
     * Persist or update a setting value.
     */
    public static function setValue(string $key, mixed $value, string $type = 'string', string $group = 'general'): self
    {
        $stringValue = match ($type) {
            'boolean', 'bool' => $value ? '1' : '0',
            'json' => is_string($value) ? $value : json_encode($value),
            default => (string) $value,
        };

        return static::updateOrCreate(
            ['key' => $key],
            [
                'value' => $stringValue,
                'type'  => $type,
                'group' => $group,
            ]
        );
    }
}
